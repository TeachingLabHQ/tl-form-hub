export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen w-full overflow-auto py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-sm rounded-[25px] shadow-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-700">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-blue-900 font-semibold">
              ⚠️ Internal Use Only
            </p>
            <p className="text-blue-800 mt-1">
              TL Form Hub is an internal platform exclusively for Teaching Lab employees and authorized contractors. This application is not intended for external or public use.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Teaching Lab ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the TL Form Hub application (the "Service").
            </p>
            <p className="mt-3">
              <strong>Important:</strong> TL Form Hub is an internal management tool designed exclusively for Teaching Lab employees, contractors, and authorized personnel. Access is restricted to individuals with valid Teaching Lab credentials. This platform is not intended for external or public use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (name, email address) when you sign in via Google OAuth</li>
              <li>Work log entries including project names, roles, activities, and hours worked</li>
              <li>Payment form submissions including task details, work hours, and project information</li>
              <li>Comments and additional information you provide in forms</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Login timestamps and session data</li>
              <li>Browser type and device information</li>
              <li>IP address and general location data</li>
              <li>Usage data and interaction with the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and maintain the Service</li>
              <li>Process and track work logs and payment requests</li>
              <li>Verify your identity and authorization to access specific forms</li>
              <li>Generate reports and summaries for project management</li>
              <li>Send notifications and administrative communications</li>
              <li>Improve and optimize the Service</li>
              <li>Comply with legal obligations and internal policies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Data Sharing and Disclosure</h2>
            <p className="mb-2">We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Internal Teams:</strong> Project leads, finance team, and operations staff for legitimate business purposes</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating the Service (e.g., Supabase for hosting, Google for authentication)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
            </ul>
            <p className="mt-3">
              We do not sell, rent, or share your personal information with third parties for their marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Encrypted data transmission (HTTPS/SSL)</li>
              <li>Secure authentication via Google OAuth</li>
              <li>Row-level security policies in our database</li>
              <li>Regular security updates and monitoring</li>
            </ul>
            <p className="mt-3">
              However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p>
              We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce our agreements. Work logs and payment records are retained according to our record-keeping policies and applicable regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and review your personal information</li>
              <li>Request corrections to inaccurate data</li>
              <li>Request deletion of your data (subject to legal retention requirements)</li>
              <li>Opt-out of certain data processing activities</li>
              <li>Withdraw consent where we rely on consent to process your data</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, please contact us at{" "}
              <a href="mailto:project.log@teachinglab.org" className="text-blue-600 hover:underline">
                project.log@teachinglab.org
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Third-Party Services</h2>
            <p className="mb-2">Our Service integrates with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google OAuth:</strong> For authentication (subject to Google's Privacy Policy)</li>
              <li><strong>Supabase:</strong> For data storage and hosting (subject to Supabase's Privacy Policy)</li>
              <li><strong>Monday.com:</strong> For project and employee data integration (subject to Monday.com's Privacy Policy)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p>
              The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-3 bg-gray-50 p-4 rounded-lg">
              <p><strong>Email:</strong>{" "}
                <a href="mailto:project.log@teachinglab.org" className="text-blue-600 hover:underline">
                  project.log@teachinglab.org
                </a>
              </p>
              <p className="mt-2"><strong>Attention:</strong> Operations Team</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

