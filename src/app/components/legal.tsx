export const LEGAL_LAST_UPDATED = "2025-10-11";

/* --------------------------- TERMS & CONDITIONS --------------------------- */

export function TermsContent() {
  return (
    <div className="prose prose-invert max-w-none leading-relaxed text-gray-200">
      <p className="text-sm text-gray-400 mb-6">
        <strong>Last updated:</strong> {LEGAL_LAST_UPDATED}
      </p>

      <h2 className="text-xl font-bold mb-2">Acceptance of Terms</h2>
      <p className="mb-5">
        By creating an account or using <strong>BlazePose Coach</strong> (“App”), you agree to these Terms
        & Conditions. If you do not agree, please discontinue use. We may update these Terms from time to
        time. Continued use means you accept the latest version posted in-app or on our website.
      </p>

      <h2 className="text-xl font-bold mb-2">About BlazePose Coach</h2>
      <p className="mb-5">
        BlazePose Coach is a <strong>supplementary self-checking system</strong> that provides feedback on
        boxing techniques through computer vision (MediaPipe BlazePose / TensorFlow.js) and
        <strong> rule-based motion analysis</strong>. The app references International Boxing Association
        (IBA) technical standards and general boxing fundamentals to help users practice correct form.
        It is <strong>not a replacement</strong> for a certified coach, trainer, or medical professional.
      </p>

      <h2 className="text-xl font-bold mb-2">Appropriate Use and Safety</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>Warm up properly and ensure adequate space with good lighting before training.</li>
        <li>Follow your coach’s instructions and gym safety rules at all times.</li>
        <li>Stop immediately if you experience pain, dizziness, or discomfort.</li>
        <li>Avoid using the app in hazardous environments or while operating vehicles.</li>
      </ul>

      <h2 className="text-xl font-bold mb-2">Account Responsibilities</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>Provide accurate registration details and maintain confidentiality of your credentials.</li>
        <li>You are responsible for all activity under your account.</li>
        <li>We may suspend or terminate accounts that violate these Terms or applicable laws.</li>
      </ul>

      <h2 className="text-xl font-bold mb-2">User Content and Permissions</h2>
      <p className="mb-5">
        You retain rights to all media and data you create. To operate the app, you grant BlazePose Coach
        a limited, temporary license to process motion frames and pose landmarks strictly for feedback,
        security, and analytics purposes. Unless you choose to save recordings, raw video is processed
        in-memory and not stored permanently.
      </p>

      <h2 className="text-xl font-bold mb-2">Acceptable Use Policy</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>No reverse engineering, scraping, or bypassing security mechanisms.</li>
        <li>No uploading of harmful, illegal, or infringing material.</li>
        <li>No attempts to identify or track other users via pose or metadata.</li>
        <li>Automation and bots are prohibited except through authorized APIs.</li>
      </ul>

      <h2 className="text-xl font-bold mb-2">Intellectual Property</h2>
      <p className="mb-5">
        BlazePose Coach’s software, design, and documentation remain our property or that of our
        licensors. You may not copy, modify, distribute, or derive works except where permitted by law.
      </p>

      <h2 className="text-xl font-bold mb-2">Disclaimer and Limitation of Liability</h2>
      <p className="mb-5">
        The App is provided “as is” without warranties. We are not liable for injury, data loss, or
        damages arising from use or inability to use the App. Training results vary among users.
      </p>

      <h2 className="text-xl font-bold mb-2">Termination</h2>
      <p className="mb-5">
        You may discontinue use at any time. We reserve the right to suspend or terminate your account
        for violations, security issues, or compliance requirements.
      </p>
    </div>
  );
}

/* ------------------------------ PRIVACY POLICY ----------------------------- */

export function PrivacyContent() {
  return (
    <div className="prose prose-invert max-w-none leading-relaxed text-gray-200">
      <p className="text-sm text-gray-400 mb-6">
        <strong>Last updated:</strong> {LEGAL_LAST_UPDATED}
      </p>

      <h2 className="text-xl font-bold mb-2">Overview</h2>
      <p className="mb-5">
        BlazePose Coach is built with privacy in mind. This policy explains how we collect, use, and
        protect your data when you use our application. Our design minimizes data collection and avoids
        long-term storage of raw video unless you choose otherwise.
      </p>

      <h2 className="text-xl font-bold mb-2">Information We Collect</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>
          <strong>Account Information:</strong> email, username, and consent metadata (e.g., the date
          you agreed to these Terms and Privacy Policy).
        </li>
        <li>
          <strong>Pose and Training Data:</strong> skeletal keypoints, joint angles, punch events,
          timestamps, and confidence scores generated by MediaPipe BlazePose.
        </li>
        <li>
          <strong>Device and Session Data:</strong> browser type, device info, performance metrics, and
          error logs to maintain stability and security.
        </li>
      </ul>

      <h2 className="text-xl font-bold mb-2">How We Use Your Information</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>Authenticate your account and secure user sessions.</li>
        <li>Provide real-time feedback and session analytics.</li>
        <li>Improve motion-detection accuracy and app reliability.</li>
        <li>Detect misuse or suspicious activity to enhance safety.</li>
        <li>Comply with legal obligations and enforce Terms.</li>
      </ul>

      <h2 className="text-xl font-bold mb-2">Data Storage and Security</h2>
      <p className="mb-5">
        Data is stored in Supabase under <strong>Row-Level Security (RLS)</strong>, ensuring that only
        you can access your data. Our system uses service-role keys on the server and anon keys for
        client requests. All communications are encrypted using HTTPS.
      </p>

      <h2 className="text-xl font-bold mb-2">Data Sharing</h2>
      <p className="mb-5">
        We do not sell personal data. Limited third-party processors (e.g., hosting or error monitoring)
        may handle data under strict confidentiality and security agreements.
      </p>

      <h2 className="text-xl font-bold mb-2">Your Rights</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>Access, download, or delete your personal data upon request.</li>
        <li>Update inaccurate account details at any time.</li>
        <li>Withdraw consent by deleting your account.</li>
      </ul>

      <h2 className="text-xl font-bold mb-2">Retention Policy</h2>
      <p className="mb-5">
        We retain your data while your account is active. When deleted, associated training records are
        erased or anonymized within a reasonable time, except where required by law.
      </p>

      <h2 className="text-xl font-bold mb-2">Children’s Privacy</h2>
      <p className="mb-5">
        BlazePose Coach is intended for adults or individuals capable of giving consent. If a minor’s
        data was collected unintentionally, please contact us for immediate removal.
      </p>

      <h2 className="text-xl font-bold mb-2">International Data Transfers</h2>
      <p className="mb-5">
        Your data may be processed in regions outside your country under appropriate safeguards and
        compliance frameworks.
      </p>

      <h2 className="text-xl font-bold mb-2">Cookies and Local Storage</h2>
      <p className="mb-5">
        The app may use cookies or browser storage to maintain sessions and preferences. Disabling them
        may affect certain features.
      </p>

      <h2 className="text-xl font-bold mb-2">Policy Updates</h2>
      <p className="mb-5">
        This Privacy Policy may change from time to time. The most recent version will always be
        available within the app and at our website.
      </p>
    </div>
  );
}
