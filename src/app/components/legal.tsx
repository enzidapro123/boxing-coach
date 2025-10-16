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
        By creating an account or using <strong>Knocktech</strong> (“App”), you
        agree to these Terms and Conditions. If you do not consent, please
        discontinue use. We may update these Terms periodically to reflect
        product improvements and data-privacy compliance. Your continued use
        after any revision signifies acceptance of the latest version shown
        in-app or on our website.
      </p>

      <h2 className="text-xl font-bold mb-2">About Knocktech</h2>
      <p className="mb-5">
        Knocktech is a <strong>supplementary self-checking platform</strong>{" "}
        that provides feedback on boxing techniques using computer vision
        (MediaPipe BlazePose / TensorFlow.js) and{" "}
        <strong>rule-based motion analysis</strong>. The App references
        International Boxing Association (IBA) technical standards and core
        boxing fundamentals to guide proper form. It is{" "}
        <strong>not a replacement</strong> for a certified coach, trainer, or
        medical professional.
      </p>

      <h2 className="text-xl font-bold mb-2">Appropriate Use and Safety</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>
          Ensure adequate space, stable lighting, and safe camera placement
          before training.
        </li>
        <li>
          Follow your coach’s instructions and gym safety rules at all times.
        </li>
        <li>
          Stop immediately if you experience pain, dizziness, or discomfort, and
          consult a professional.
        </li>
        <li>
          Avoid using the App in hazardous environments or while operating
          vehicles or machinery.
        </li>
      </ul>

      <h2 className="text-xl font-bold mb-2">Account Responsibilities</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>
          Provide accurate registration details and keep your credentials
          confidential.
        </li>
        <li>
          You are responsible for all activity that occurs under your account.
        </li>
        <li>
          We may suspend or terminate accounts that violate these Terms or
          applicable laws.
        </li>
      </ul>

      <h2 className="text-xl font-bold mb-2">User Content and Permissions</h2>
      <p className="mb-5">
        You retain ownership of all media and data you create. To operate the
        App, you grant Knocktech a limited, temporary license to process motion
        frames and pose landmarks strictly for feedback, security, and
        analytics. Unless you intentionally choose to save recordings, raw video
        is processed in-memory and not stored permanently.
      </p>

      <h2 className="text-xl font-bold mb-2">Acceptable Use Policy</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>
          No reverse engineering, scraping, or bypassing security or
          authorization controls.
        </li>
        <li>
          No uploading or sharing of harmful, illegal, or infringing material.
        </li>
        <li>
          No attempts to identify, track, or profile other users via pose data
          or metadata.
        </li>
        <li>
          Automation and bots are prohibited except through explicitly
          authorized APIs.
        </li>
      </ul>

      <h2 className="text-xl font-bold mb-2">Intellectual Property</h2>
      <p className="mb-5">
        Knocktech’s software, design, and documentation remain our property or
        that of our licensors. You may not copy, modify, distribute, or create
        derivative works except where permitted by law.
      </p>

      <h2 className="text-xl font-bold mb-2">
        Disclaimer and Limitation of Liability
      </h2>
      <p className="mb-5">
        The App is provided “as is” and “as available,” without warranties of
        any kind. We are not liable for injuries, data loss, or damages arising
        from use or inability to use the App. Training results vary by user.
      </p>

      <h2 className="text-xl font-bold mb-2">Termination</h2>
      <p className="mb-5">
        You may stop using the App at any time. We may suspend or terminate your
        account for violations of these Terms, security concerns, or compliance
        requirements.
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
        Knocktech follows a privacy-by-design approach. This policy explains how
        we collect, use, and protect data when you use the App. We minimize data
        collection and avoid long-term storage of raw video; unless you
        explicitly choose to save recordings, video is processed in-memory only.
        We operate in line with the Philippines Data Privacy Act of 2012 (RA
        10173).
      </p>

      <h2 className="text-xl font-bold mb-2">Information We Collect</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>
          <strong>Account Information:</strong> email, username, and consent
          metadata (e.g., the date and version of Terms/Privacy you agreed to).
        </li>
        <li>
          <strong>Pose and Training Data:</strong> skeletal keypoints, joint
          angles, punch/guard events, timestamps, and model confidence scores
          generated by MediaPipe BlazePose.
        </li>
        <li>
          <strong>Device and Session Data:</strong> browser type, device info,
          performance metrics, and error logs to maintain stability and
          security.
        </li>
      </ul>

      <h2 className="text-xl font-bold mb-2">How We Use Your Information</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>Authenticate your account and secure sessions.</li>
        <li>Provide real-time feedback and session analytics.</li>
        <li>Improve detection accuracy and app reliability.</li>
        <li>Detect misuse or suspicious activity to enhance safety.</li>
        <li>Comply with legal obligations and enforce Terms.</li>
      </ul>

      <h2 className="text-xl font-bold mb-2">Data Storage and Security</h2>
      <p className="mb-5">
        Data is stored in Supabase under{" "}
        <strong>Row-Level Security (RLS)</strong>, ensuring that only you can
        access your data. The system uses service-role keys on the server and
        anon keys for client requests. All communications are encrypted via
        HTTPS.
      </p>

      <h2 className="text-xl font-bold mb-2">Data Sharing</h2>
      <p className="mb-5">
        We do not sell personal data. Limited third-party processors (e.g.,
        hosting or error monitoring) may handle data under strict
        confidentiality and security agreements.
      </p>

      <h2 className="text-xl font-bold mb-2">Your Rights</h2>
      <ul className="list-disc ml-6 mb-5 space-y-2">
        <li>Access, download, or delete your personal data upon request.</li>
        <li>Update inaccurate account details at any time.</li>
        <li>Withdraw consent by deleting your account.</li>
      </ul>

      <h2 className="text-xl font-bold mb-2">Retention Policy</h2>
      <p className="mb-5">
        We retain your data while your account is active. When you delete your
        account, associated training records are erased or anonymized within a
        reasonable period, except where retention is required by law.
      </p>

      <h2 className="text-xl font-bold mb-2">Children’s Privacy</h2>
      <p className="mb-5">
        Knocktech is intended for adults or individuals capable of giving
        consent. If a minor’s data is collected unintentionally, contact us for
        prompt removal.
      </p>

      <h2 className="text-xl font-bold mb-2">International Data Transfers</h2>
      <p className="mb-5">
        Your data may be processed in regions outside your country under
        appropriate safeguards and compliance frameworks.
      </p>

      <h2 className="text-xl font-bold mb-2">Cookies and Local Storage</h2>
      <p className="mb-5">
        The App may use cookies or browser storage to maintain sessions and
        preferences (e.g., “remember me,” theme). Disabling them may affect
        certain features.
      </p>

      <h2 className="text-xl font-bold mb-2">Policy Updates</h2>
      <p className="mb-5">
        We may update this Privacy Policy from time to time. The most recent
        version will always be available within the App and on our website.
      </p>
    </div>
  );
}
