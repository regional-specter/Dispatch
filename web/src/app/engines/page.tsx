import { getEngineModel, listEngineUnits } from "@/lib/api";
import EnginesClient from "./EnginesClient";

export default async function EnginesPage() {
  const [modelInfo, units] = await Promise.all([getEngineModel(), listEngineUnits()]);
  return <EnginesClient modelInfo={modelInfo} initialUnits={units} />;
}
