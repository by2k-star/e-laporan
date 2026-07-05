import { createFileRoute } from "@tanstack/react-router";
import { FieldsPage } from "@/features/fields-page";
export const Route = createFileRoute("/_authenticated/fields")({ component: FieldsPage });
