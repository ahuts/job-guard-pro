import { Shield } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">Last updated: April 13, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostJob runs entirely in your browser. We do not collect, store, or transmit any personal data to external servers. Your LinkedIn activity and browsing history remain completely private.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">Data Collection</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostJob does <strong className="text-foreground">not</strong> collect:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li>Personal information (name, email, phone)</li>
              <li>Browsing history or activity outside LinkedIn job pages</li>
              <li>LinkedIn account data, messages, or connections</li>
              <li>Cookies or tracking identifiers</li>
              <li>Any data transmitted to third parties</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">Local Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostJob uses Chrome's local storage (<code className="text-sm bg-secondary px-2 py-0.5 rounded">chrome.storage.local</code>) to save:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li>Your Trust Score results from previous scans</li>
              <li>Extension preferences</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              This data never leaves your browser and can be cleared at any time by removing the extension.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">Permissions</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostJob requests minimal permissions:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-foreground">activeTab</strong> — Reads LinkedIn job page content only when you click "Scan for Ghost Jobs"</li>
              <li><strong className="text-foreground">storage</strong> — Saves scan results and preferences locally in your browser</li>
              <li><strong className="text-foreground">LinkedIn host access</strong> — Injects the scan button and results overlay into job posting pages</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostJob does not integrate with or send data to any third-party services, analytics platforms, or advertising networks.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">Changes</h2>
            <p className="text-muted-foreground leading-relaxed">
              If we update this policy, we'll change the "Last updated" date above. Significant changes will be noted in the extension's release notes.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about privacy? Reach us at <a href="mailto:privacy@jobghost.io" className="text-primary hover:underline">privacy@jobghost.io</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacyPolicy;