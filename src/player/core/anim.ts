// numeric animations → a single copy of strings at draw time
export const AN = ["idle","dash","jump","fall","ledge"] as const;
export const A  = { idle:0, dash:1, jump:2, fall:3, ledge:4 } as const;
