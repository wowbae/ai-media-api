import { createFileRoute } from "@tanstack/react-router";
import { MediaChatPage } from "../media/$chatId";
import { APP_MODES } from "@/lib/app-mode";

export const Route = createFileRoute("/ai-model/$chatId")({
    component: AiModelChatPage,
});

function AiModelChatPage() {
    return <MediaChatPage appMode={APP_MODES.AI_MODEL} routeBase='/ai-model' />;
}
