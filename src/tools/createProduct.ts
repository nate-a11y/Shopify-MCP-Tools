import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Variant input schema
const VariantInputSchema = z.object({
  title: z.string().optional().describe("The title of the variant (e.g., 'Small', 'Blue')"),
  price: z.string().describe("The price of the variant"),
  compareAtPrice: z.string().optional().describe("Compare at price for showing a markdown"),
  sku: z.string().optional().describe("Stock keeping unit (SKU)"),
  barcode: z.string().optional().describe("Barcode (ISBN, UPC, GTIN, etc.)"),
  inventoryPolicy: z.enum(["DENY", "CONTINUE"]).optional().describe("What happens when a variant is out of stock"),
  weight: z.number().optional().describe("Weight of the variant"),
  weightUnit: z.enum(["KILOGRAMS", "GRAMS", "POUNDS", "OUNCES"]).optional().describe("Unit of weight measurement"),
  requiresShipping: z.boolean().optional().describe("Whether the variant requires shipping"),
  taxable: z.boolean().optional().describe("Whether the variant is taxable"),
  options: z.array(z.string()).optional().describe("The option values for this variant (e.g., ['Small', 'Blue'])")
});

// Input schema for createProduct
const CreateProductInputSchema = z.object({
  title: z.string().min(1).describe("The title/name of the product"),
  descriptionHtml: z.string().optional().describe("The HTML description of the product"),
  vendor: z.string().optional().describe("The vendor or manufacturer of the product"),
  productType: z.string().optional().describe("The type or category of the product"),
  tags: z.array(z.string()).optional().describe("Array of tags to categorize the product"),
  status: z.enum(["ACTIVE", "ARCHIVED", "DRAFT"]).optional().describe("Product status (defaults to DRAFT)"),
  seo: z.object({
    title: z.string().optional().describe("SEO-optimized title for the product"),
    description: z.string().optional().describe("SEO meta description for the product")
  }).optional().describe("SEO information for the product"),
  options: z.array(z.string()).optional().describe("Product option names (e.g., ['Size', 'Color'])"),
  variants: z.array(VariantInputSchema).optional().describe("Product variants with pricing and inventory options"),
  giftCard: z.boolean().optional().describe("Whether this is a gift card product"),
  requiresSellingPlan: z.boolean().optional().describe("Whether the product can only be purchased with a selling plan"),
  templateSuffix: z.string().optional().describe("The theme template suffix for this product")
});

type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

interface ProductCreateResponse {
  productCreate: {
    product: {
      id: string;
      title: string;
      handle: string;
      descriptionHtml: string;
      vendor: string;
      productType: string;
      tags: string[];
      status: string;
      createdAt: string;
      seo: {
        title: string | null;
        description: string | null;
      };
      options: Array<{
        id: string;
        name: string;
        values: string[];
      }>;
      variants: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            price: string;
            compareAtPrice: string | null;
            sku: string | null;
            barcode: string | null;
            inventoryPolicy: string;
            inventoryQuantity: number;
          };
        }>;
      };
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
 * Tool for creating a new product
 * @returns {Object} Created product details
 */
const createProduct = {
  name: "create-product",
  description: "Create a new product in the Shopify store. You can specify title, description, variants, pricing, and more.",
  schema: CreateProductInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateProductInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const {
        title,
        descriptionHtml,
        vendor,
        productType,
        tags,
        status,
        seo,
        options,
        variants,
        giftCard,
        requiresSellingPlan,
        templateSuffix
      } = input;

      const mutation = gql`
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
              handle
              descriptionHtml
              vendor
              productType
              tags
              status
              createdAt
              seo {
                title
                description
              }
              options {
                id
                name
                values
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    price
                    compareAtPrice
                    sku
                    barcode
                    inventoryPolicy
                    inventoryQuantity
                  }
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

      // Build the product input
      const productInput: {
        title: string;
        descriptionHtml?: string;
        vendor?: string;
        productType?: string;
        tags?: string[];
        status?: string;
        seo?: { title?: string; description?: string };
        options?: string[];
        variants?: Array<{
          title?: string;
          price: string;
          compareAtPrice?: string;
          sku?: string;
          barcode?: string;
          inventoryPolicy?: string;
          weight?: number;
          weightUnit?: string;
          requiresShipping?: boolean;
          taxable?: boolean;
          options?: string[];
        }>;
        giftCard?: boolean;
        requiresSellingPlan?: boolean;
        templateSuffix?: string;
      } = {
        title
      };

      if (descriptionHtml) {
        productInput.descriptionHtml = descriptionHtml;
      }

      if (vendor) {
        productInput.vendor = vendor;
      }

      if (productType) {
        productInput.productType = productType;
      }

      if (tags) {
        productInput.tags = tags;
      }

      if (status) {
        productInput.status = status;
      }

      if (seo) {
        productInput.seo = seo;
      }

      if (options) {
        productInput.options = options;
      }

      if (variants) {
        productInput.variants = variants.map(variant => ({
          title: variant.title,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          sku: variant.sku,
          barcode: variant.barcode,
          inventoryPolicy: variant.inventoryPolicy,
          weight: variant.weight,
          weightUnit: variant.weightUnit,
          requiresShipping: variant.requiresShipping,
          taxable: variant.taxable,
          options: variant.options
        }));
      }

      if (giftCard !== undefined) {
        productInput.giftCard = giftCard;
      }

      if (requiresSellingPlan !== undefined) {
        productInput.requiresSellingPlan = requiresSellingPlan;
      }

      if (templateSuffix) {
        productInput.templateSuffix = templateSuffix;
      }

      const variables = {
        input: productInput
      };

      const data = (await shopifyClient.request(mutation, variables)) as ProductCreateResponse;

      if (data.productCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create product: ${data.productCreate.userErrors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      if (!data.productCreate.product) {
        throw new Error("Product creation failed: No product returned");
      }

      const product = data.productCreate.product;

      // Format variants for response
      const formattedVariants = product.variants.edges.map((edge) => ({
        id: edge.node.id,
        title: edge.node.title,
        price: edge.node.price,
        compareAtPrice: edge.node.compareAtPrice,
        sku: edge.node.sku,
        barcode: edge.node.barcode,
        inventoryPolicy: edge.node.inventoryPolicy,
        inventoryQuantity: edge.node.inventoryQuantity
      }));

      return {
        success: true,
        product: {
          id: product.id,
          title: product.title,
          handle: product.handle,
          descriptionHtml: product.descriptionHtml,
          vendor: product.vendor,
          productType: product.productType,
          tags: product.tags,
          status: product.status,
          createdAt: product.createdAt,
          seo: product.seo,
          options: product.options,
          variants: formattedVariants
        }
      };
    } catch (error) {
      console.error("Error creating product:", error);
      throw new Error(
        `Failed to create product: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createProduct };
