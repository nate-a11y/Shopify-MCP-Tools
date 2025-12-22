import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Rule condition schema for smart collections
const RuleConditionSchema = z.object({
  column: z.enum([
    "TAG",
    "TITLE",
    "TYPE",
    "VENDOR",
    "VARIANT_PRICE",
    "VARIANT_COMPARE_AT_PRICE",
    "VARIANT_WEIGHT",
    "VARIANT_INVENTORY",
    "VARIANT_TITLE",
    "IS_PRICE_REDUCED"
  ]).describe("The property to match against"),
  relation: z.enum([
    "EQUALS",
    "NOT_EQUALS",
    "GREATER_THAN",
    "LESS_THAN",
    "STARTS_WITH",
    "ENDS_WITH",
    "CONTAINS",
    "NOT_CONTAINS",
    "IS_SET",
    "IS_NOT_SET"
  ]).describe("The relationship between the column and the condition"),
  condition: z.string().describe("The value to match against")
});

// Input schema for createCollection
const CreateCollectionInputSchema = z.object({
  title: z.string().min(1).describe("The title of the collection"),
  descriptionHtml: z.string().optional().describe("The HTML description of the collection"),
  handle: z.string().optional().describe("The URL handle for the collection (auto-generated from title if not provided)"),
  seo: z.object({
    title: z.string().optional().describe("SEO-optimized title for the collection"),
    description: z.string().optional().describe("SEO meta description for the collection")
  }).optional().describe("SEO information for the collection"),
  image: z.object({
    src: z.string().describe("The URL of the image"),
    altText: z.string().optional().describe("Alt text for the image")
  }).optional().describe("Featured image for the collection"),
  templateSuffix: z.string().optional().describe("The theme template suffix for this collection"),
  sortOrder: z.enum([
    "ALPHA_ASC",
    "ALPHA_DESC",
    "BEST_SELLING",
    "CREATED",
    "CREATED_DESC",
    "MANUAL",
    "PRICE_ASC",
    "PRICE_DESC"
  ]).optional().describe("How products in the collection are sorted"),
  ruleSet: z.object({
    appliedDisjunctively: z.boolean().describe("If true, products match any rule (OR). If false, products must match all rules (AND)."),
    rules: z.array(RuleConditionSchema).min(1).describe("The rules that define which products belong to this collection")
  }).optional().describe("Rules for a smart collection. If provided, creates a smart collection; otherwise creates a manual collection."),
  products: z.array(z.string()).optional().describe("Array of product GIDs to add to a manual collection (only for manual collections, not smart collections)")
});

type CreateCollectionInput = z.infer<typeof CreateCollectionInputSchema>;

interface CollectionCreateResponse {
  collectionCreate: {
    collection: {
      id: string;
      title: string;
      handle: string;
      descriptionHtml: string;
      sortOrder: string;
      templateSuffix: string | null;
      productsCount: number;
      seo: {
        title: string | null;
        description: string | null;
      };
      image: {
        url: string;
        altText: string | null;
      } | null;
      ruleSet: {
        appliedDisjunctively: boolean;
        rules: Array<{
          column: string;
          relation: string;
          condition: string;
        }>;
      } | null;
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
 * Tool for creating a new collection
 * @returns {Object} Created collection details
 */
const createCollection = {
  name: "create-collection",
  description: "Create a new collection in the Shopify store. You can create either a manual collection (where you add products manually) or a smart collection (where products are automatically added based on rules).",
  schema: CreateCollectionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateCollectionInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const {
        title,
        descriptionHtml,
        handle,
        seo,
        image,
        templateSuffix,
        sortOrder,
        ruleSet,
        products
      } = input;

      const mutation = gql`
        mutation collectionCreate($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
              handle
              descriptionHtml
              sortOrder
              templateSuffix
              productsCount
              seo {
                title
                description
              }
              image {
                url
                altText
              }
              ruleSet {
                appliedDisjunctively
                rules {
                  column
                  relation
                  condition
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      // Build the collection input
      const collectionInput: {
        title: string;
        descriptionHtml?: string;
        handle?: string;
        seo?: { title?: string; description?: string };
        image?: { src: string; altText?: string };
        templateSuffix?: string;
        sortOrder?: string;
        ruleSet?: {
          appliedDisjunctively: boolean;
          rules: Array<{
            column: string;
            relation: string;
            condition: string;
          }>;
        };
        products?: string[];
      } = {
        title
      };

      if (descriptionHtml) {
        collectionInput.descriptionHtml = descriptionHtml;
      }

      if (handle) {
        collectionInput.handle = handle;
      }

      if (seo) {
        collectionInput.seo = seo;
      }

      if (image) {
        collectionInput.image = image;
      }

      if (templateSuffix) {
        collectionInput.templateSuffix = templateSuffix;
      }

      if (sortOrder) {
        collectionInput.sortOrder = sortOrder;
      }

      if (ruleSet) {
        collectionInput.ruleSet = ruleSet;
      }

      if (products && products.length > 0 && !ruleSet) {
        // Only add products for manual collections (not smart collections)
        collectionInput.products = products;
      }

      const variables = {
        input: collectionInput
      };

      const data = (await shopifyClient.request(mutation, variables)) as CollectionCreateResponse;

      if (data.collectionCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create collection: ${data.collectionCreate.userErrors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      if (!data.collectionCreate.collection) {
        throw new Error("Collection creation failed: No collection returned");
      }

      const collection = data.collectionCreate.collection;

      return {
        success: true,
        collection: {
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
          descriptionHtml: collection.descriptionHtml,
          sortOrder: collection.sortOrder,
          templateSuffix: collection.templateSuffix,
          productsCount: collection.productsCount,
          seo: collection.seo,
          image: collection.image,
          ruleSet: collection.ruleSet,
          isSmartCollection: collection.ruleSet !== null
        }
      };
    } catch (error) {
      console.error("Error creating collection:", error);
      throw new Error(
        `Failed to create collection: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createCollection };
