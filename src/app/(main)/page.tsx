import { redirect } from "next/navigation";

export default function MainPage() {
  // Redirigir a órdenes por defecto
  redirect("/orders");
}
