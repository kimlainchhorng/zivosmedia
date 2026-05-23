import { useParams } from "react-router-dom";

export default function BusinessSoftwareDownloadPage() {
  const { storeId } = useParams();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Business Software</h1>
        <p className="text-muted-foreground">Downloads for store {storeId} are coming soon.</p>
      </div>
    </div>
  );
}
