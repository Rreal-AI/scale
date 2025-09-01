import { parse } from "csv-parse/sync";
import path from "path";
import fs from "fs";
import { normalizedEquals } from "@/lib/normalize";

const RAW_DATA_FILE_NAME = "MenuItem_Export.csv";
const PRODUCTS_OUTPUT_FILE_NAME = "products.json";
const MODIFIERS_OUTPUT_FILE_NAME = "modifiers.json";

const RAW_DATA_FILE_PATH = path.resolve(
  process.cwd(),
  "src",
  "data",
  "raw",
  RAW_DATA_FILE_NAME
);

const PRODUCTS_OUTPUT_FILE_PATH = path.resolve(
  process.cwd(),
  "src",
  "data",
  PRODUCTS_OUTPUT_FILE_NAME
);
const MODIFIERS_OUTPUT_FILE_PATH = path.resolve(
  process.cwd(),
  "src",
  "data",
  MODIFIERS_OUTPUT_FILE_NAME
);

// Item ID,GUID,Name,Number,Imported ID,Target,Owner,Base Price,Created Date,Archived,Modifier,SKU,PLU
// 400000029713900782,00182b92-769c-4008-a6cb-09fa37e77c77,GUSTOSO AGUARDIENTE - RUM,400000029713900783,,RREAL TACOS,RREAL TACOS,8.00,4/25/2023,No,No,,

interface RawDataRow {
  ItemID: string;
  GUID: string;
  Name: string;
  Number: string;
  "Imported ID": string;
  Target: string;
  Owner: string;
  "Base Price": string;
  "Created Date": string;
  Archived: "Yes" | "No";
  Modifier: "Yes" | "No";
  SKU: string;
  PLU: string;
}

interface ProcessedDataRow {
  name: string;
  price: number;
  weight: number;
}

const rawData = parse(fs.readFileSync(RAW_DATA_FILE_PATH, "latin1"), {
  columns: true,
}) as RawDataRow[];

const modifiers = rawData.filter((row) => row.Modifier === "Yes");
const products = rawData.filter((row) => row.Modifier === "No");

// names are repeated, so we need to deduplicate them using normalizedEquals
const deduplicatedModifiers = modifiers.filter(
  (modifier, index, self) =>
    index === self.findIndex((t) => normalizedEquals(t.Name, modifier.Name))
);
const deduplicatedProducts = products.filter(
  (product, index, self) =>
    index === self.findIndex((t) => normalizedEquals(t.Name, product.Name))
);

const processedModifiers = deduplicatedModifiers.map((modifier) => ({
  name: modifier.Name,
  price: Number(modifier["Base Price"]),
  weight: 0,
}));

const processedProducts = deduplicatedProducts.map((product) => ({
  name: product.Name,
  price: Number(product["Base Price"]),
  weight: 0,
}));

fs.writeFileSync(
  MODIFIERS_OUTPUT_FILE_PATH,
  JSON.stringify(processedModifiers, null, 2)
);
fs.writeFileSync(
  PRODUCTS_OUTPUT_FILE_PATH,
  JSON.stringify(processedProducts, null, 2)
);
