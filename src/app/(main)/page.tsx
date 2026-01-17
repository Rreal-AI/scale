import { redirect } from "next/navigation";

export default function MainPage() {
  // Redirigir a productos por defecto
  redirect("/products");
}
