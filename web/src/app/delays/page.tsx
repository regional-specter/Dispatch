import { getDelayModel } from "@/lib/api";
import DelayForm from "./DelayForm";

export default async function DelaysPage() {
  return <DelayForm modelInfo={await getDelayModel()} />;
}
