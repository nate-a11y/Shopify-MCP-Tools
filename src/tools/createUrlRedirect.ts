import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for createUrlRedirect
const CreateUrlRedirectInputSchema = z.object({
  path: z.string().min(1).describe("The old path to redirect from (e.g., '/old-page' or '/collections/old-collection')"),
  target: z.string().min(1).describe("The new path or URL to redirect to (e.g., '/new-page' or 'https://example.com/page')")
});

type CreateUrlRedirectInput = z.infer<typeof CreateUrlRedirectInputSchema>;

interface UrlRedirectCreateResponse {
  urlRedirectCreate: {
    urlRedirect: {
      id: string;
      path: string;
      target: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for creating URL redirects for SEO purposes
 * @returns {Object} Created redirect details
 */
const createUrlRedirect = {
  name: "create-url-redirect",
  description: "Create a URL redirect for SEO purposes. Redirects old URLs to new ones to preserve search engine rankings and provide a good user experience when URLs change.",
  schema: CreateUrlRedirectInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateUrlRedirectInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { path, target } = input;

      const mutation = gql`
        mutation urlRedirectCreate($urlRedirect: UrlRedirectInput!) {
          urlRedirectCreate(urlRedirect: $urlRedirect) {
            urlRedirect {
              id
              path
              target
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        urlRedirect: {
          path,
          target
        }
      };

      const data = (await shopifyClient.request(mutation, variables)) as UrlRedirectCreateResponse;

      if (data.urlRedirectCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create URL redirect: ${data.urlRedirectCreate.userErrors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      if (!data.urlRedirectCreate.urlRedirect) {
        throw new Error("URL redirect creation failed: No redirect returned");
      }

      const redirect = data.urlRedirectCreate.urlRedirect;

      return {
        success: true,
        urlRedirect: {
          id: redirect.id,
          path: redirect.path,
          target: redirect.target
        }
      };
    } catch (error) {
      console.error("Error creating URL redirect:", error);
      throw new Error(
        `Failed to create URL redirect: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createUrlRedirect };
