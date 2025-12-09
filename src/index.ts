#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import minimist from "minimist";
import { z } from "zod";

// Import tools
import { getProductById } from "./tools/getProductById.js";
import { getProducts } from "./tools/getProducts.js";
import { updateProduct } from "./tools/updateProduct.js";
import { getCollections } from "./tools/getCollections.js";
import { updateCollection } from "./tools/updateCollection.js";
import { getPages } from "./tools/getPages.js";
import { updatePage } from "./tools/updatePage.js";
import { getBlogs } from "./tools/getBlogs.js";
import { updateBlog } from "./tools/updateBlog.js";
import { getArticles } from "./tools/getArticles.js";
import { updateArticle } from "./tools/updateArticle.js";
import { getBlogById } from "./tools/getBlogById.js";
import { getArticleById } from "./tools/getArticleById.js";
import { searchShopify } from "./tools/searchShopify.js";
import { createArticle } from "./tools/createArticle.js";

// Import metafield tools
import { getProductMetafields } from "./tools/getProductMetafields.js";
import { createProductMetafield } from "./tools/createProductMetafield.js";
import { updateProductMetafield } from "./tools/updateProductMetafield.js";
import { deleteProductMetafield } from "./tools/deleteProductMetafield.js";

// Import metafield definition tools
import { getMetafieldDefinitions } from "./tools/getMetafieldDefinitions.js";
import { createMetafieldDefinition } from "./tools/createMetafieldDefinition.js";
import { updateMetafieldDefinition } from "./tools/updateMetafieldDefinition.js";
import { deleteMetafieldDefinition } from "./tools/deleteMetafieldDefinition.js";

// Import metaobject tools
import { getMetaobjects } from "./tools/getMetaobjects.js";
import { createMetaobject } from "./tools/createMetaobject.js";
import { updateMetaobject } from "./tools/updateMetaobject.js";
import { deleteMetaobject } from "./tools/deleteMetaobject.js";

// Import metaobject definition tools
import { createMetaobjectDefinition } from "./tools/createMetaobjectDefinition.js";
import { updateMetaobjectDefinition } from "./tools/updateMetaobjectDefinition.js";

// Import product management tools
import { createProduct } from "./tools/createProduct.js";
import { deleteProduct } from "./tools/deleteProduct.js";

// Import collection tools
import { createCollection } from "./tools/createCollection.js";

// Import inventory tools
import { adjustInventory } from "./tools/adjustInventory.js";

// Import file tools
import { createFile } from "./tools/createFile.js";

// Import URL redirect tools
import { createUrlRedirect } from "./tools/createUrlRedirect.js";

// Import menu tools
import { getMenus } from "./tools/getMenus.js";
import { createMenu } from "./tools/createMenu.js";
import { updateMenu } from "./tools/updateMenu.js";
import { deleteMenu } from "./tools/deleteMenu.js";

// Import theme tools
import { getThemes } from "./tools/getThemes.js";

// Import translation tools
import { registerTranslations } from "./tools/registerTranslations.js";

// Parse command line arguments
const argv = minimist(process.argv.slice(2));

// Load environment variables from .env file (if it exists)
dotenv.config();

// Define environment variables - from command line or .env file
const SHOPIFY_ACCESS_TOKEN =
  argv.accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
const MYSHOPIFY_DOMAIN = argv.domain || process.env.MYSHOPIFY_DOMAIN;

// Store in process.env for backwards compatibility
process.env.SHOPIFY_ACCESS_TOKEN = SHOPIFY_ACCESS_TOKEN;
process.env.MYSHOPIFY_DOMAIN = MYSHOPIFY_DOMAIN;

// Shopify API version - can be overridden via env/CLI, defaults to 2025-01
const SHOPIFY_API_VERSION =
  argv.apiVersion || process.env.SHOPIFY_API_VERSION || "2025-01";

// Validate required environment variables
if (!SHOPIFY_ACCESS_TOKEN) {
  console.error("Error: SHOPIFY_ACCESS_TOKEN is required.");
  console.error("Please provide it via command line argument or .env file.");
  console.error("  Command line: --accessToken=your_token");
  process.exit(1);
}

if (!MYSHOPIFY_DOMAIN) {
  console.error("Error: MYSHOPIFY_DOMAIN is required.");
  console.error("Please provide it via command line argument or .env file.");
  console.error("  Command line: --domain=your-store.myshopify.com");
  process.exit(1);
}

// Create Shopify GraphQL client
const shopifyClient = new GraphQLClient(
  `https://${MYSHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
  {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json"
    }
  }
);

// Initialize tools with GraphQL client
getProducts.initialize(shopifyClient);
getProductById.initialize(shopifyClient);
updateProduct.initialize(shopifyClient);
getCollections.initialize(shopifyClient);
updateCollection.initialize(shopifyClient);
getPages.initialize(shopifyClient);
updatePage.initialize(shopifyClient);
getBlogs.initialize(shopifyClient);
updateBlog.initialize(shopifyClient);
getArticles.initialize(shopifyClient);
updateArticle.initialize(shopifyClient);
getBlogById.initialize(shopifyClient);
getArticleById.initialize(shopifyClient);
searchShopify.initialize(shopifyClient);
createArticle.initialize(shopifyClient);

// Initialize metafield tools
getProductMetafields.initialize(shopifyClient);
createProductMetafield.initialize(shopifyClient);
updateProductMetafield.initialize(shopifyClient);
deleteProductMetafield.initialize(shopifyClient);

// Initialize metafield definition tools
getMetafieldDefinitions.initialize(shopifyClient);
createMetafieldDefinition.initialize(shopifyClient);
updateMetafieldDefinition.initialize(shopifyClient);
deleteMetafieldDefinition.initialize(shopifyClient);

// Initialize metaobject tools
getMetaobjects.initialize(shopifyClient);
createMetaobject.initialize(shopifyClient);
updateMetaobject.initialize(shopifyClient);
deleteMetaobject.initialize(shopifyClient);

// Initialize metaobject definition tools
createMetaobjectDefinition.initialize(shopifyClient);
updateMetaobjectDefinition.initialize(shopifyClient);

// Initialize product management tools
createProduct.initialize(shopifyClient);
deleteProduct.initialize(shopifyClient);

// Initialize collection tools
createCollection.initialize(shopifyClient);

// Initialize inventory tools
adjustInventory.initialize(shopifyClient);

// Initialize file tools
createFile.initialize(shopifyClient);

// Initialize URL redirect tools
createUrlRedirect.initialize(shopifyClient);

// Initialize menu tools
getMenus.initialize(shopifyClient);
createMenu.initialize(shopifyClient);
updateMenu.initialize(shopifyClient);
deleteMenu.initialize(shopifyClient);

// Initialize theme tools
getThemes.initialize(shopifyClient);

// Initialize translation tools
registerTranslations.initialize(shopifyClient);

// Set up MCP server
const server = new McpServer({
  name: "shopify",
  version: "1.0.0",
  description:
    "MCP Server for Shopify API, enabling interaction with store data through GraphQL API"
});

// Add tools individually, using their schemas directly
server.tool(
  "get-products",
  {
    searchTitle: z.string().optional(),
    limit: z.number().default(10),
    after: z.string().optional(),
    before: z.string().optional(),
    reverse: z.boolean().default(false)
  },
  async (args) => {
    const result = await getProducts.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-product-by-id",
  {
    productId: z.string().min(1)
  },
  async (args) => {
    const result = await getProductById.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-collections",
  {
    searchTitle: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getCollections.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateCollection tool
server.tool(
  "update-collection",
  {
    collectionId: z.string().min(1).describe("The GID of the collection to update (e.g., \"gid://shopify/Collection/1234567890\")"),
    title: z.string().optional(),
    description: z.string().optional(),
    descriptionHtml: z.string().optional(),
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional()
    }).optional()
  },
  async (args) => {
    const result = await updateCollection.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getPages tool
server.tool(
  "get-pages",
  {
    searchTitle: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getPages.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updatePage tool
server.tool(
  "update-page",
  {
    pageId: z.string().min(1).describe("The GID of the page to update (e.g., \"gid://shopify/Page/1234567890\")"),
    title: z.string().optional(),
    body: z.string().optional(),
    bodyHtml: z.string().optional(),
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional()
    }).optional(),
    published: z.boolean().optional()
  },
  async (args) => {
    const result = await updatePage.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getBlogs tool
server.tool(
  "get-blogs",
  {
    searchTitle: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getBlogs.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateBlog tool
server.tool(
  "update-blog",
  {
    blogId: z.string().min(1).describe("The GID of the blog to update (e.g., \"gid://shopify/Blog/1234567890\")"),
    title: z.string().optional(),
    handle: z.string().optional(),
    templateSuffix: z.string().optional(),
    commentPolicy: z.enum(["MODERATED", "CLOSED"]).optional()
  },
  async (args) => {
    const result = await updateBlog.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getArticles tool
server.tool(
  "get-articles",
  {
    blogId: z.string().min(1).describe("The GID of the blog to get articles from (e.g., \"gid://shopify/Blog/1234567890\")"),
    searchTitle: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getArticles.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateArticle tool
server.tool(
  "update-article",
  {
    articleId: z.string().min(1).describe("The GID of the article to update (e.g., \"gid://shopify/Article/1234567890\")"),
    title: z.string().optional(),
    body: z.string().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.object({
      name: z.string()
    }).optional()
  },
  async (args) => {
    const result = await updateArticle.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Register new tools
server.tool(
  "get-blog-by-id",
  getBlogById.schema.shape,
  async (args: z.infer<typeof getBlogById.schema>) => {
    const result = await getBlogById.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-article-by-id",
  getArticleById.schema.shape,
  async (args: z.infer<typeof getArticleById.schema>) => {
    const result = await getArticleById.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "search-shopify",
  searchShopify.schema.shape,
  async (args: z.infer<typeof searchShopify.schema>) => {
    const result = await searchShopify.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "create-article",
  createArticle.schema.shape,
  async (args: z.infer<typeof createArticle.schema>) => {
    const result = await createArticle.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateProduct tool
server.tool(
  "update-product",
  {
    productId: z.string().min(1).describe("The GID of the product to update (e.g., \"gid://shopify/Product/1234567890\")"),
    title: z.string().optional().describe("The new title for the product"),
    descriptionHtml: z.string().optional().describe("The new HTML description for the product"),
    seo: z.object({
      title: z.string().optional().describe("SEO-optimized title for the product"),
      description: z.string().optional().describe("SEO meta description for the product")
    }).optional().describe("SEO information for the product"),
    status: z.enum(["ACTIVE", "ARCHIVED", "DRAFT"]).optional().describe("Product status (ACTIVE, ARCHIVED, or DRAFT)"),
    vendor: z.string().optional().describe("The vendor or manufacturer of the product"),
    productType: z.string().optional().describe("The type or category of the product"),
    tags: z.array(z.string()).optional().describe("Array of tags to categorize the product"),
    variants: z.array(z.object({
      id: z.string().optional().describe("The GID of the variant to update"),
      price: z.string().optional().describe("The price of the variant"),
      compareAtPrice: z.string().optional().describe("Compare at price for showing a markdown"),
      sku: z.string().optional().describe("Stock keeping unit (SKU)"),
      barcode: z.string().optional().describe("Barcode (ISBN, UPC, GTIN, etc.)"),
      inventoryQuantity: z.number().optional().describe("Available inventory quantity"),
      inventoryPolicy: z.enum(["DENY", "CONTINUE"]).optional().describe("What happens when a variant is out of stock"),
      fulfillmentService: z.string().optional().describe("Service responsible for fulfilling the variant"),
      weight: z.number().optional().describe("Weight of the variant"),
      weightUnit: z.enum(["KILOGRAMS", "GRAMS", "POUNDS", "OUNCES"]).optional().describe("Unit of weight measurement")
    })).optional().describe("Product variants to update")
  },
  async (args) => {
    const result = await updateProduct.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add metafield tools
server.tool(
  "get-product-metafields",
  getProductMetafields.schema.shape,
  async (args: z.infer<typeof getProductMetafields.schema>) => {
    const result = await getProductMetafields.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "create-product-metafield",
  createProductMetafield.schema.shape,
  async (args: z.infer<typeof createProductMetafield.schema>) => {
    const result = await createProductMetafield.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "update-product-metafield",
  updateProductMetafield.schema.shape,
  async (args: z.infer<typeof updateProductMetafield.schema>) => {
    const result = await updateProductMetafield.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "delete-product-metafield",
  deleteProductMetafield.schema.shape,
  async (args: z.infer<typeof deleteProductMetafield.schema>) => {
    const result = await deleteProductMetafield.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add metafield definition tools
server.tool(
  "get-metafield-definitions",
  getMetafieldDefinitions.schema.shape,
  async (args: z.infer<typeof getMetafieldDefinitions.schema>) => {
    const result = await getMetafieldDefinitions.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "create-metafield-definition",
  createMetafieldDefinition.schema.shape,
  async (args: z.infer<typeof createMetafieldDefinition.schema>) => {
    const result = await createMetafieldDefinition.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "update-metafield-definition",
  updateMetafieldDefinition.schema.shape,
  async (args: z.infer<typeof updateMetafieldDefinition.schema>) => {
    const result = await updateMetafieldDefinition.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "delete-metafield-definition",
  deleteMetafieldDefinition.schema.shape,
  async (args: z.infer<typeof deleteMetafieldDefinition.schema>) => {
    const result = await deleteMetafieldDefinition.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add metaobject tools
server.tool(
  "get-metaobjects",
  getMetaobjects.schema.shape,
  async (args: z.infer<typeof getMetaobjects.schema>) => {
    const result = await getMetaobjects.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "create-metaobject",
  createMetaobject.schema.shape,
  async (args: z.infer<typeof createMetaobject.schema>) => {
    const result = await createMetaobject.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "update-metaobject",
  updateMetaobject.schema.shape,
  async (args: z.infer<typeof updateMetaobject.schema>) => {
    const result = await updateMetaobject.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "delete-metaobject",
  deleteMetaobject.schema.shape,
  async (args: z.infer<typeof deleteMetaobject.schema>) => {
    const result = await deleteMetaobject.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add metaobject definition tools
server.tool(
  "create-metaobject-definition",
  createMetaobjectDefinition.schema.shape,
  async (args: z.infer<typeof createMetaobjectDefinition.schema>) => {
    const result = await createMetaobjectDefinition.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "update-metaobject-definition",
  updateMetaobjectDefinition.schema.shape,
  async (args: z.infer<typeof updateMetaobjectDefinition.schema>) => {
    const result = await updateMetaobjectDefinition.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add product management tools
server.tool(
  "create-product",
  createProduct.schema.shape,
  async (args: z.infer<typeof createProduct.schema>) => {
    const result = await createProduct.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "delete-product",
  deleteProduct.schema.shape,
  async (args: z.infer<typeof deleteProduct.schema>) => {
    const result = await deleteProduct.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add collection tools
server.tool(
  "create-collection",
  createCollection.schema.shape,
  async (args: z.infer<typeof createCollection.schema>) => {
    const result = await createCollection.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add inventory tools
server.tool(
  "adjust-inventory",
  adjustInventory.schema.shape,
  async (args: z.infer<typeof adjustInventory.schema>) => {
    const result = await adjustInventory.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add file tools
server.tool(
  "create-file",
  createFile.schema.shape,
  async (args: z.infer<typeof createFile.schema>) => {
    const result = await createFile.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add URL redirect tools
server.tool(
  "create-url-redirect",
  createUrlRedirect.schema.shape,
  async (args: z.infer<typeof createUrlRedirect.schema>) => {
    const result = await createUrlRedirect.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add menu tools
server.tool(
  "get-menus",
  getMenus.schema.shape,
  async (args: z.infer<typeof getMenus.schema>) => {
    const result = await getMenus.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "create-menu",
  createMenu.schema.shape,
  async (args: z.infer<typeof createMenu.schema>) => {
    const result = await createMenu.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "update-menu",
  updateMenu.schema.shape,
  async (args: z.infer<typeof updateMenu.schema>) => {
    const result = await updateMenu.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "delete-menu",
  deleteMenu.schema.shape,
  async (args: z.infer<typeof deleteMenu.schema>) => {
    const result = await deleteMenu.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add theme tools
server.tool(
  "get-themes",
  getThemes.schema.shape,
  async (args: z.infer<typeof getThemes.schema>) => {
    const result = await getThemes.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add translation tools
server.tool(
  "register-translations",
  registerTranslations.schema.shape,
  async (args: z.infer<typeof registerTranslations.schema>) => {
    const result = await registerTranslations.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
server
  .connect(transport)
  .then(() => {})
  .catch((error: unknown) => {
    console.error("Failed to start Shopify MCP Server:", error);
  });
