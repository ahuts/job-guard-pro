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
          <p className="text-muted-foreground">Last updated: April 30, 2026</p>
          <p className="text-muted-foreground text-sm mt-1">Effective date: April 30, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostJob ("we," "our," or "the Extension") is a Chrome browser extension that analyzes LinkedIn job postings for legitimacy signals. This Privacy Policy describes what data we collect, how we use it, where it is stored, who it is shared with, and your rights regarding your information.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect the following categories of user data:
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.1 Account Information</h3>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-foreground">Email address</strong> — used for account creation and authentication</li>
              <li><strong className="text-foreground">Password</strong> — stored as a hashed value via our authentication provider (Supabase); we do not have access to your plain-text password</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.2 Scan Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you save a scan result to your Dashboard, we collect:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-foreground">Job URL</strong> — the LinkedIn job posting URL you scanned</li>
              <li><strong className="text-foreground">Job title and company name</strong> — extracted from the posting for display in your Dashboard</li>
              <li><strong className="text-foreground">Trust Score</strong> — the numerical legitimacy rating (0–100)</li>
              <li><strong className="text-foreground">Detected signals</strong> — red, yellow, and green flag indicators with quotes from the posting</li>
              <li><strong className="text-foreground">Scan date</strong> — when the scan was performed</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.3 Usage Data</h3>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-foreground">Scan count</strong> — number of scans performed per month, used to enforce free tier limits (3 scans/month)</li>
              <li><strong className="text-foreground">Subscription status</strong> — whether you are on the Free or Pro plan</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.4 Local Browser Data</h3>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-foreground">Extension preferences</strong> — stored in <code className="text-sm bg-secondary px-2 py-0.5 rounded">chrome.storage.local</code></li>
              <li><strong className="text-foreground">Authentication tokens</strong> — stored in <code className="text-sm bg-secondary px-2 py-0.5 rounded">chrome.storage.local</code> for session persistence (access token and refresh token)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Local browser data never leaves your device and is not transmitted to any server.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use collected data for the following purposes:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-foreground">Authentication</strong> — to create and manage your account, log you in, and maintain your session</li>
              <li><strong className="text-foreground">Save to Dashboard</strong> — to store scan results so you can review them later on your Dashboard</li>
              <li><strong className="text-foreground">Usage enforcement</strong> — to track scan counts and apply free tier limits (3 scans/month for free users, unlimited for Pro users)</li>
              <li><strong className="text-foreground">Subscription management</strong> — to verify and manage your Pro subscription status via Stripe</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              We do not use your data for advertising, marketing, profiling, or any purpose beyond the core functionality described above.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your account information and saved scan data are stored on servers managed by our backend provider, Supabase Inc. Supabase hosts data on Amazon Web Services (AWS) infrastructure. Your data is stored in the region configured for our project.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Local browser data (extension preferences and authentication tokens) is stored on your device using Chrome's local storage API and is not transmitted to any server.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Third-Party Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We share user data with the following third parties:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-foreground">Supabase Inc.</strong> — acts as our data processor for authentication, database storage, and API services. Supabase stores account credentials (hashed passwords), saved scan results, and usage data. Supabase's privacy policy: <a href="https://supabase.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a></li>
              <li><strong className="text-foreground">Stripe, Inc.</strong> — processes Pro subscription payments. Stripe receives payment card information and transaction details. We do not store your full card number. Stripe's privacy policy: <a href="https://stripe.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a></li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              We do not share user data with any other third parties, including advertising networks, analytics platforms, data brokers, or social media companies.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. If you delete your account, we will delete your account information and all associated scan data from our servers within 30 days. Authentication tokens stored locally in your browser are cleared immediately upon logout.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the following rights regarding your data:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-foreground">Access</strong> — you can view your saved scan data at any time via the Dashboard</li>
              <li><strong className="text-foreground">Deletion</strong> — you can delete your account and all associated data by contacting us at <a href="mailto:privacy@jobghost.io" className="text-primary hover:underline">privacy@jobghost.io</a></li>
              <li><strong className="text-foreground">Local data clearing</strong> — you can clear local browser data at any time by removing the extension or clearing browser storage</li>
              <li><strong className="text-foreground">Opt-out</strong> — you may use the extension without creating an account (free tier, 3 scans/month without saving)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We take reasonable measures to protect your data, including:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li>All data transmitted between the extension and our servers is encrypted via HTTPS/TLS</li>
              <li>Passwords are hashed by Supabase using bcrypt — we never store or have access to plain-text passwords</li>
              <li>Authentication tokens are stored locally in Chrome's secure storage API</li>
              <li>Access to production databases is restricted and logged</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Permissions</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostJob requests the following browser permissions:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-foreground">activeTab</strong> — reads LinkedIn job page content only when you click "Scan for Ghost Jobs"</li>
              <li><strong className="text-foreground">storage</strong> — saves scan results, preferences, and authentication tokens locally in your browser</li>
              <li><strong className="text-foreground">Host access to linkedin.com</strong> — injects the scan button and results overlay into LinkedIn job posting pages</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Page content is analyzed locally in your browser. Raw page content is not transmitted to any server. Only saved scan summaries (job title, company, score, signals) are sent to our backend when you explicitly click "Save to Dashboard."
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              GhostJob is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13, we will delete it promptly.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. Significant changes will be noted in the extension's release notes. Continued use of the extension after changes constitutes acceptance of the updated policy.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or your data, please contact us at <a href="mailto:privacy@jobghost.io" className="text-primary hover:underline">privacy@jobghost.io</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacyPolicy;