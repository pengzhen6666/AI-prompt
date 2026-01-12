import React, { useState, useEffect } from "react";
import { ArrowLeft, Shield, FileText } from "lucide-react";
import { Link, useLocation } from "react-router";

const Legal = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  useEffect(() => {
    if (location.hash === "#privacy") {
      setActiveTab("privacy");
    } else {
      setActiveTab("terms");
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <div className="font-bold text-lg">Legal Center</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab("terms")}
              className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                activeTab === "terms"
                  ? "bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 border-b-2 border-gray-900 dark:border-zinc-100"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                activeTab === "privacy"
                  ? "bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 border-b-2 border-gray-900 dark:border-zinc-100"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </button>
          </div>

          {/* Content */}
          <div className="p-8 md:p-12 prose prose-gray dark:prose-invert max-w-none">
            {activeTab === "terms" ? (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-black mb-2">Terms of Service</h1>
                  <p className="text-gray-500 text-sm">
                    Last updated: December 15, 2025
                  </p>
                </div>

                <section>
                  <h2 className="text-xl font-bold mb-4">1. Introduction</h2>
                  <p>
                    Welcome to Nanobanana. By accessing our website, you agree
                    to be bound by these Terms of Service, all applicable laws
                    and regulations, and agree that you are responsible for
                    compliance with any applicable local laws.
                  </p>
                </section>

                <section className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-2xl border border-yellow-100 dark:border-yellow-900/20">
                  <h2 className="text-xl font-bold mb-4 text-yellow-800 dark:text-yellow-200">
                    2. Prompt Usage & Attribution
                  </h2>
                  <p className="text-yellow-900 dark:text-yellow-100 font-medium">
                    The AI prompts provided on Nanobanana are for educational
                    and creative inspiration purposes.
                  </p>
                  <ul className="list-disc pl-5 mt-4 space-y-2 text-yellow-900/80">
                    <li>
                      You are free to use these prompts to generate images for
                      personal or commercial use.
                    </li>
                    <li className="font-bold">
                      However, if you publicly share, republish, or distribute
                      the prompts themselves (in raw text format) or use them in
                      a commercial product (e.g., a prompt marketplace), you
                      MUST clearly acknowledge Nanobanana as the source.
                    </li>
                    <li>
                      Attribution format: "Prompt source: Nanobanana.ai" or a
                      direct link to the original prompt page.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">3. User Conduct</h2>
                  <p>
                    You agree not to use the website for any unlawful purpose or
                    any purpose prohibited under this clause. You agree not to
                    use the website in any way that could damage the website,
                    the services, or the general business of Nanobanana.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">4. Disclaimer</h2>
                  <p>
                    The materials on Nanobanana's website are provided on an 'as
                    is' basis. Nanobanana makes no warranties, expressed or
                    implied, and hereby disclaims and negates all other
                    warranties including, without limitation, implied warranties
                    or conditions of merchantability, fitness for a particular
                    purpose, or non-infringement of intellectual property or
                    other violation of rights.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-black mb-2">Privacy Policy</h1>
                  <p className="text-gray-500 text-sm">
                    Last updated: December 15, 2025
                  </p>
                </div>

                <section>
                  <h2 className="text-xl font-bold mb-4">
                    1. Information We Collect
                  </h2>
                  <p>
                    We collect information to provide better services to all our
                    users. This includes:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
                    <li>
                      <strong>Usage Data:</strong> We may collect information
                      about how you access and use the Service ("Usage Data").
                    </li>
                    <li>
                      <strong>Cookies:</strong> We use cookies and similar
                      tracking technologies to track the activity on our Service
                      and hold certain information.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">
                    2. How We Use Your Information
                  </h2>
                  <p>
                    Nanobanana uses the collected data for various purposes:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
                    <li>To provide and maintain the Service</li>
                    <li>To notify you about changes to our Service</li>
                    <li>
                      To allow you to participate in interactive features of our
                      Service when you choose to do so
                    </li>
                    <li>To provide customer care and support</li>
                    <li>
                      To provide analysis or valuable information so that we can
                      improve the Service
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">3. Data Security</h2>
                  <p>
                    The security of your data is important to us, but remember
                    that no method of transmission over the Internet, or method
                    of electronic storage is 100% secure. While we strive to use
                    commercially acceptable means to protect your Personal Data,
                    we cannot guarantee its absolute security.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4">4. Contact Us</h2>
                  <p>
                    If you have any questions about this Privacy Policy, please
                    contact us.
                  </p>
                </section>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-gray-400 dark:text-zinc-500 text-sm">
        © 2024 Nanobanana. All rights reserved.
      </footer>
    </div>
  );
};

export default Legal;
