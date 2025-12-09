import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Translation input schema
const TranslationInputSchema = z.object({
  key: z.string().min(1).describe("The key/field to translate (e.g., 'title', 'body_html', 'meta_title')"),
  value: z.string().describe("The translated value"),
  translatableContentDigest: z.string().min(1).describe("The digest of the original content being translated (get this from translatableResource query)")
});

// Input schema for registerTranslations
const RegisterTranslationsInputSchema = z.object({
  resourceId: z.string().min(1).describe("The GID of the resource to translate (e.g., 'gid://shopify/Product/123456')"),
  locale: z.string().min(2).describe("The locale code for the translation (e.g., 'fr', 'es', 'de', 'ja')"),
  translations: z.array(TranslationInputSchema).min(1).describe("Array of translations to register")
});

type RegisterTranslationsInput = z.infer<typeof RegisterTranslationsInputSchema>;

interface TranslationsRegisterResponse {
  translationsRegister: {
    translations: Array<{
      key: string;
      value: string;
      locale: string;
    }> | null;
    userErrors: Array<{
      field: string[];
      message: string;
      code: string;
    }>;
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for registering translations for resources
 * @returns {Object} Registered translations
 */
const registerTranslations = {
  name: "register-translations",
  description: "Register translations for a Shopify resource (product, collection, page, etc.) in a specific locale. This enables multi-language support for your store. Note: You need to first get the translatableContentDigest for each field from the translatableResource query.",
  schema: RegisterTranslationsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: RegisterTranslationsInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { resourceId, locale, translations } = input;

      const mutation = gql`
        mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
          translationsRegister(resourceId: $resourceId, translations: $translations) {
            translations {
              key
              value
              locale
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      // Format translations for the API
      const formattedTranslations = translations.map(t => ({
        key: t.key,
        value: t.value,
        locale,
        translatableContentDigest: t.translatableContentDigest
      }));

      const variables = {
        resourceId,
        translations: formattedTranslations
      };

      const data = (await shopifyClient.request(mutation, variables)) as TranslationsRegisterResponse;

      if (data.translationsRegister.userErrors.length > 0) {
        throw new Error(
          `Failed to register translations: ${data.translationsRegister.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.translationsRegister.translations || data.translationsRegister.translations.length === 0) {
        throw new Error("Translation registration failed: No translations returned");
      }

      return {
        success: true,
        translations: data.translationsRegister.translations.map(t => ({
          key: t.key,
          value: t.value,
          locale: t.locale
        })),
        resourceId
      };
    } catch (error) {
      console.error("Error registering translations:", error);
      throw new Error(
        `Failed to register translations: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { registerTranslations };
