import { createFileRoute } from "@tanstack/react-router";
import { MyActivitiesPage } from "@/features/my-activities-page";
export const Route = createFileRoute("/_authenticated/my-activities")({ component: MyActivitiesPage });
