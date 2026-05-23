import { useParams } from "react-router-dom";

export default function AutoRepairDesktopAppPage() {
  const { storeId } = useParams();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Auto Repair Desktop App</h1>
        <p className="text-muted-foreground">Desktop app for store {storeId} is coming soon.</p>
      </div>
    </div>
  );
}
