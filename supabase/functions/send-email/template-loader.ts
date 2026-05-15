// Template loader for email templates
// Uses embedded templates from templates.ts to avoid file system access issues

import { templates as embeddedTemplates } from "./templates.ts";

const templateCache: Record<string, string> = {};

export async function loadTemplate(templateName: string): Promise<string> {
  // Check cache first
  if (templateCache[templateName]) {
    return templateCache[templateName];
  }

  // Load from embedded templates
  if (embeddedTemplates[templateName]) {
    templateCache[templateName] = embeddedTemplates[templateName];
    return embeddedTemplates[templateName];
  }

  // Template not found
  console.error(`❌ Template not found: ${templateName}`);
  console.error(
    `Available templates: ${Object.keys(embeddedTemplates).join(", ")}`,
  );
  throw new Error(
    `Template ${templateName} not found. Available templates: ${Object.keys(embeddedTemplates).join(", ")}`,
  );
}

export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value || "");
  }
  return result;
}
