import { Card, CardContent } from "@/components/ui/card";
import { ChromeIcon, CHROME_STORE_URL } from "@/components/ChromeIcon";

interface ExtensionInstallBannerProps {
  savedJobsCount: number;
}

export default function ExtensionInstallBanner({ savedJobsCount }: ExtensionInstallBannerProps) {
  if (savedJobsCount > 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5 mb-6">
      <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-semibold text-foreground">
            👋 Next step: Install the Chrome extension
          </h3>
          <p className="text-muted-foreground mt-1">
            Scan job postings directly on LinkedIn for ghost job signals. See Trust Scores, red flags, and save jobs to your dashboard.
          </p>
        </div>
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-5 rounded-lg transition-colors whitespace-nowrap shadow-md"
        >
          <ChromeIcon />
          Add to Chrome — Free
        </a>
      </CardContent>
    </Card>
  );
}
