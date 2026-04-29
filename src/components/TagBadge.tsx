import { Tag } from "antd";
import { colorForTag } from "@/lib/theme";

interface Props {
  tag: string;
}

export default function TagBadge({ tag }: Props) {
  return (
    <Tag color={colorForTag(tag)} style={{ marginInlineEnd: 0 }}>
      {tag}
    </Tag>
  );
}
