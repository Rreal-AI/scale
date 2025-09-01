import "dotenv/config";

import fs from "fs";
import path from "path";

import { db } from ".";
import { products } from "./schema/products";
import { modifiers } from "./schema/modifiers";

const seed = async () => {
  const productsData = JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "src", "data", "products.json"),
      "utf8"
    )
  ) as { name: string; price: number; weight: number }[];
  const modifiersData = JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "src", "data", "modifiers.json"),
      "utf8"
    )
  ) as { name: string; price: number; weight: number }[];

  const ORG_ID = process.env.SEED_ORG_ID;

  if (!ORG_ID) {
    throw new Error("SEED_ORG_ID is not set");
  }

  await db.insert(products).values(
    productsData.map((product) => ({
      org_id: ORG_ID,
      name: product.name,
      price: Math.round(product.price * 100),
      weight: product.weight,
    }))
  );

  await db.insert(modifiers).values(
    modifiersData.map((modifier) => ({
      org_id: ORG_ID,
      name: modifier.name,
      price: Math.round(modifier.price * 100),
      weight: modifier.weight,
    }))
  );
};

seed();
