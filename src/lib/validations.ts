import { z } from "zod";

export const domainSchema = z
  .string()
  .min(1, "Por favor, digite um domínio.")
  .max(253, "O domínio é muito longo.")
  .refine(
    (val) => {
      const clean = val.replace(/^https?:\/\//, "");
      const labels = clean.split(".");
      if (labels.length < 2) return false;
      for (const label of labels) {
        if (label.length < 1 || label.length > 63) return false;
        if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label)) {
          return false;
        }
      }
      const tld = labels[labels.length - 1];
      if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
      if (/[^a-zA-Z0-9.-]/.test(clean)) return false;
      return true;
    },
    { message: "Formato de domínio inválido. Use exemplo.com ou sub.exemplo.com" }
  )
  .transform((val) =>
    val.replace(/^https?:\/\//, "").replace(/\/$/, "")
  );

export const importDomainsSchema = z.array(z.string());

export type DomainInput = z.infer<typeof domainSchema>;
