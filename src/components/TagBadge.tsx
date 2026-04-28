import { Tag } from "antd";
import { tagColors } from "@/lib/theme";
import type { ContactTag } from "@/lib/contactsDb";

interface Props {
  tag: ContactTag;
}

export default function TagBadge({ tag }: Props) {
  return <Tag color={tagColors[tag]} style={{ marginInlineEnd: 0 }}>{tag}</Tag>;
}
