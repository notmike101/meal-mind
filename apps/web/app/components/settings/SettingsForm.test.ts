import type { PublicSettingsDto } from "@mealmind/contracts";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import SectionPanel from "~/components/SectionPanel.vue";
import AutomationField from "./AutomationField.vue";
import ConnectionFields from "./ConnectionFields.vue";
import FormActions from "./FormActions.vue";
import PantryField from "./PantryField.vue";
import PlanningFields from "./PlanningFields.vue";
import ServingFields from "./ServingFields.vue";
import SettingsForm from "./SettingsForm.vue";

const settings: PublicSettingsDto = {
  id: 1,
  timezone: "America/Chicago",
  aiBaseUrl: "https://provider.example/v1",
  aiModel: "private-model",
  aiAuthConfigured: true,
  planningPreferences: "Vegetarian meals",
  planningVarietyRules: "Avoid repeated dinners",
  defaultMealServings: 2,
  defaultWeeklyMealCount: 7,
  autoGenerateNextWeek: false,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

function render(models = [{ id: "reported-model" }]) {
  const fetchMock = vi.fn().mockImplementation(async (path: string) => ({
    ok: true,
    data: path === "/api/settings/test-ai"
      ? { models, authConfigured: true }
      : { settings, pantryStaples: [] },
  }));
  vi.stubGlobal("$fetch", fetchMock);
  const wrapper = mount(SettingsForm, {
    props: { settings, pantryStaples: [] },
    global: {
      plugins: [createPinia()],
      components: {
        SectionPanel,
        SettingsAutomationField: AutomationField,
        SettingsConnectionFields: ConnectionFields,
        SettingsFormActions: FormActions,
        SettingsPantryField: PantryField,
        SettingsPlanningFields: PlanningFields,
        SettingsServingFields: ServingFields,
      },
    },
  });
  return { wrapper, fetchMock };
}

function modelInput(wrapper: VueWrapper<InstanceType<typeof SettingsForm>>) {
  const fields = wrapper.findComponent(ConnectionFields);
  return fields.findAll("label").find((label) => /AI model/i.test(label.text()))!.get("input");
}

async function clickAction(wrapper: VueWrapper<InstanceType<typeof SettingsForm>>, name: RegExp) {
  const button = wrapper.findComponent(FormActions).findAll("button").find((button) => name.test(button.text()))!;
  await button.trigger("click");
  await flushPromises();
}

describe("SettingsForm provider configuration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([{ models: [{ id: "reported-model" }] }, { models: [] }])("keeps an unlisted model editable and saveable after loading catalog $models", async ({ models }) => {
    const { wrapper, fetchMock } = render(models);

    await clickAction(wrapper, /load models/i);

    const input = modelInput(wrapper);
    expect((input.element as HTMLInputElement).value).toBe("private-model");
    await input.setValue("another-private-model");
    const saveButton = wrapper.findComponent(FormActions).findAll("button").find((button) => /^save$/i.test(button.text()))!;
    expect(saveButton.attributes("disabled")).toBeUndefined();
    await clickAction(wrapper, /^save$/i);

    expect(fetchMock).toHaveBeenCalledWith("/api/settings", expect.objectContaining({
      method: "PATCH",
      body: expect.objectContaining({ aiModel: "another-private-model" }),
    }));
  });

  it("preserves a configured credential when its blank field is left untouched", async () => {
    const { wrapper, fetchMock } = render();
    const input = wrapper.get("input[type='password']");
    expect((input.element as HTMLInputElement).value).toBe("");

    await clickAction(wrapper, /^save$/i);

    const request = fetchMock.mock.calls.find(([path, options]) => path === "/api/settings" && options?.method === "PATCH")!;
    expect(request).toBeDefined();
    expect(JSON.parse(JSON.stringify(request[1].body))).not.toHaveProperty("aiApiKey");
  });

  it("uses a typed credential for discovery and persists it on save", async () => {
    const { wrapper, fetchMock } = render();
    await wrapper.get("input[type='password']").setValue("test-only-provider-key");

    await clickAction(wrapper, /load models/i);

    expect(fetchMock).toHaveBeenCalledWith("/api/settings/test-ai", expect.objectContaining({
      method: "POST",
      body: { aiBaseUrl: "https://provider.example/v1", aiApiKey: "test-only-provider-key" },
    }));
    await clickAction(wrapper, /^save$/i);
    expect(fetchMock).toHaveBeenCalledWith("/api/settings", expect.objectContaining({
      method: "PATCH",
      body: expect.objectContaining({ aiApiKey: "test-only-provider-key" }),
    }));
    expect(wrapper.text()).not.toContain("test-only-provider-key");
  });

  it("explicitly removes a configured credential for discovery and save", async () => {
    const { wrapper, fetchMock } = render();
    const removeButton = wrapper.findComponent(ConnectionFields).findAll("button")
      .find((button) => /(?:remove|clear).*(?:key|credential|token)/i.test(button.text()))!;
    expect(removeButton).toBeDefined();
    await removeButton.trigger("click");

    await clickAction(wrapper, /load models/i);

    expect(fetchMock).toHaveBeenCalledWith("/api/settings/test-ai", expect.objectContaining({
      method: "POST",
      body: { aiBaseUrl: "https://provider.example/v1", aiApiKey: null },
    }));
    await clickAction(wrapper, /^save$/i);
    expect(fetchMock).toHaveBeenCalledWith("/api/settings", expect.objectContaining({
      method: "PATCH",
      body: expect.objectContaining({ aiApiKey: null }),
    }));
  });

  it("saves a manually entered model after discovery fails", async () => {
    const { wrapper, fetchMock } = render();
    fetchMock.mockRejectedValueOnce(new Error("Provider unavailable"));

    await clickAction(wrapper, /load models/i);
    await modelInput(wrapper).setValue("manual-model");
    await clickAction(wrapper, /^save$/i);

    expect(fetchMock).toHaveBeenCalledWith("/api/settings", expect.objectContaining({
      method: "PATCH",
      body: expect.objectContaining({ aiModel: "manual-model" }),
    }));
  });

  it("clears a saved replacement key and does not resend it", async () => {
    const { wrapper, fetchMock } = render();
    await wrapper.get("input[type='password']").setValue("test-only-provider-key");
    await clickAction(wrapper, /^save$/i);

    expect((wrapper.get("input[type='password']").element as HTMLInputElement).value).toBe("");
    await clickAction(wrapper, /load models/i);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/settings/test-ai", expect.objectContaining({
      body: { aiBaseUrl: settings.aiBaseUrl },
    }));
    await clickAction(wrapper, /^save$/i);
    const patches = fetchMock.mock.calls.filter(([path, options]) => path === "/api/settings" && options?.method === "PATCH");
    expect(JSON.parse(JSON.stringify(patches[1]![1].body))).not.toHaveProperty("aiApiKey");
  });

  it("clears a persisted key from the PATCH response even when a settings GET would fail", async () => {
    const { wrapper, fetchMock } = render();
    const savedEndpoint = "https://saved-provider.example/v1";
    const nextEndpoint = "https://next-provider.example/v1";
    fetchMock.mockImplementation(async (path: string, options?: { method?: string }) => {
      if (path === "/api/settings" && options?.method === "PATCH") {
        return { ok: true, data: { settings: { ...settings, aiBaseUrl: savedEndpoint }, pantryStaples: [] } };
      }
      if (path === "/api/settings/test-ai") {
        return { ok: true, data: { models: [], authConfigured: false } };
      }
      throw new Error("Settings GET unavailable");
    });
    const fields = wrapper.findComponent(ConnectionFields);
    const endpointInput = fields.findAll("label").find((label) => /AI base URL/i.test(label.text()))!.get("input");
    await endpointInput.setValue(savedEndpoint);
    await wrapper.get("input[type='password']").setValue("persisted-provider-key");
    await clickAction(wrapper, /^save$/i);

    expect((wrapper.get("input[type='password']").element as HTMLInputElement).value).toBe("");
    expect(wrapper.text()).toContain("Settings saved.");
    expect(fields.props("authConfigured")).toBe(true);
    expect(fields.props("endpointChanged")).toBe(false);
    expect(fetchMock.mock.calls.filter(([path, options]) => path === "/api/settings" && options?.method !== "PATCH")).toHaveLength(0);
    await endpointInput.setValue(nextEndpoint);
    expect(fields.props("authConfigured")).toBe(false);
    expect(fields.props("endpointChanged")).toBe(true);
    await clickAction(wrapper, /load models/i);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/settings/test-ai", expect.objectContaining({
      body: { aiBaseUrl: nextEndpoint },
    }));
    await clickAction(wrapper, /^save$/i);
    const patches = fetchMock.mock.calls.filter(([path, options]) => path === "/api/settings" && options?.method === "PATCH");
    expect(patches[0]![1].body).toHaveProperty("aiApiKey", "persisted-provider-key");
    expect(patches[1]![1].body).not.toHaveProperty("aiApiKey");
  });

  it("reflects refreshed authentication after removing a key without sending null again", async () => {
    const { wrapper, fetchMock } = render();
    fetchMock.mockImplementation(async (path: string) => ({
      ok: true,
      data: path === "/api/settings/test-ai"
        ? { models: [], authConfigured: false }
        : { settings: { ...settings, aiAuthConfigured: false }, pantryStaples: [] },
    }));
    await wrapper.findComponent(ConnectionFields).get("button").trigger("click");
    await clickAction(wrapper, /^save$/i);

    expect(wrapper.findComponent(ConnectionFields).props("authConfigured")).toBe(false);
    expect((wrapper.get("input[type='password']").element as HTMLInputElement).value).toBe("");
    await clickAction(wrapper, /load models/i);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/settings/test-ai", expect.objectContaining({
      body: { aiBaseUrl: settings.aiBaseUrl },
    }));
  });

  it("invalidates discovery on endpoint or key changes without clearing the selected model", async () => {
    const { wrapper, fetchMock } = render();
    const fields = wrapper.findComponent(ConnectionFields);
    await clickAction(wrapper, /load models/i);
    expect(fields.props("modelsLoaded")).toBe(true);
    await fields.get("input[type='password']").setValue("replacement-key");
    expect(fields.props("models")).toEqual([]);
    await clickAction(wrapper, /load models/i);
    await fields.get("input[type='password']").setValue("");
    await fields.findAll("label").find((label) => /AI base URL/i.test(label.text()))!.get("input").setValue("https://other.example/v1");

    expect(fields.props("modelsLoaded")).toBe(false);
    expect(fields.props("models")).toEqual([]);
    expect(fields.props("authConfigured")).toBe(false);
    expect(fields.props("endpointChanged")).toBe(true);
    expect((modelInput(wrapper).element as HTMLInputElement).value).toBe("private-model");
    await clickAction(wrapper, /load models/i);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/settings/test-ai", expect.objectContaining({
      body: { aiBaseUrl: "https://other.example/v1" },
    }));
  });

  it("treats normalized endpoint URLs as the same saved connection", async () => {
    const { wrapper } = render();
    const fields = wrapper.findComponent(ConnectionFields);
    await clickAction(wrapper, /load models/i);
    await fields.findAll("label").find((label) => /AI base URL/i.test(label.text()))!.get("input").setValue("https://provider.example/v1/");

    expect(fields.props("modelsLoaded")).toBe(true);
    expect(fields.props("authConfigured")).toBe(true);
    expect(fields.props("endpointChanged")).toBe(false);
  });

  it("ignores discovery results for a connection that changed while loading", async () => {
    const { wrapper, fetchMock } = render();
    const { promise, resolve } = Promise.withResolvers<unknown>();
    fetchMock.mockImplementationOnce(() => promise);
    const loadButton = wrapper.findComponent(FormActions).findAll("button").find((button) => /load models/i.test(button.text()))!;
    await loadButton.trigger("click");
    await wrapper.get("input[type='password']").setValue("new-key");
    resolve({ ok: true, data: { models: [{ id: "old-key-model" }], authConfigured: true } });
    await flushPromises();

    const fields = wrapper.findComponent(ConnectionFields);
    expect(fields.props("models")).toEqual([]);
    expect(fields.props("modelsLoaded")).toBe(false);
  });
});
