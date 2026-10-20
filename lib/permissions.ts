import { Conversation, Group, Connection } from "./models";
export async function canAccessConversation(userId: string, conversationId: string) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return null;
  if (conversation.type === "group") {
    const group = await Group.findOne({ _id: conversation.groupId, members: userId, status: "active" });
    return group ? conversation : null;
  }
  const allowed = (conversation.participants || []).some((id: any) => String(id) === userId);
  if (!allowed) return null;
  if (conversation.participants?.length === 2) {
    const pairKey = [...conversation.participants.map((x: any) => String(x))].sort().join(":");
    const connection = await Connection.findOne({ pairKey, status: "accepted" });
    if (!connection) return null;
  }
  return conversation;
}
