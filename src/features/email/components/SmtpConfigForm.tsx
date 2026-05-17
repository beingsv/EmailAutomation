"use client";

import { useState, FormEvent } from "react";
import { useSmtpConfig } from "../hooks/useSmtpConfig";

export function SmtpConfigForm() {
  const {
    status,
    isLoading,
    isTesting,
    isSaving,
    testResult,
    saveError,
    saveSuccess,
    testConnection,
    saveConfig,
    resetTestResult,
  } = useSmtpConfig();

  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [testPassed, setTestPassed] = useState(false);

  const handleFieldChange = () => {
    // Reset test state when fields change
    setTestPassed(false);
    resetTestResult();
  };

  const handleTest = async (e: FormEvent) => {
    e.preventDefault();
    const success = await testConnection({
      host,
      port: Number(port),
      username,
      password,
    });
    setTestPassed(success);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await saveConfig({
      host,
      port: Number(port),
      username,
      password,
    });
  };

  const isFormValid = host.trim() && port.trim() && username.trim() && password.trim();

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/3" />
          <div className="h-10 bg-gray-800 rounded" />
          <div className="h-10 bg-gray-800 rounded" />
          <div className="h-10 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Connection Status</h3>
        {status?.configured ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-700">
              Configured
            </span>
            <span className="text-gray-300 text-sm">
              {status.host}:{status.port} — {status.username}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-700">
              Not Configured
            </span>
            <span className="text-gray-400 text-sm">
              Set up your SMTP credentials below to enable email sending.
            </span>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-1">SMTP Configuration</h3>
        <p className="text-gray-400 text-sm mb-6">
          Configure your email server settings. Gmail with App Passwords is recommended.
        </p>

        <form className="space-y-4">
          {/* Host */}
          <div>
            <label htmlFor="smtp-host" className="block text-sm font-medium text-gray-300 mb-1">
              SMTP Host
            </label>
            <input
              id="smtp-host"
              type="text"
              value={host}
              onChange={(e) => { setHost(e.target.value); handleFieldChange(); }}
              placeholder="smtp.gmail.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Port */}
          <div>
            <label htmlFor="smtp-port" className="block text-sm font-medium text-gray-300 mb-1">
              Port
            </label>
            <input
              id="smtp-port"
              type="number"
              value={port}
              onChange={(e) => { setPort(e.target.value); handleFieldChange(); }}
              placeholder="587"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="smtp-username" className="block text-sm font-medium text-gray-300 mb-1">
              Email (Username)
            </label>
            <input
              id="smtp-username"
              type="email"
              value={username}
              onChange={(e) => { setUsername(e.target.value); handleFieldChange(); }}
              placeholder="you@gmail.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="smtp-password" className="block text-sm font-medium text-gray-300 mb-1">
              App Password
            </label>
            <input
              id="smtp-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); handleFieldChange(); }}
              placeholder="Your Gmail App Password"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-md border text-sm ${
                testResult.success
                  ? "bg-green-900/30 border-green-700 text-green-400"
                  : "bg-red-900/30 border-red-700 text-red-400"
              }`}
            >
              {testResult.success ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {testResult.message}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {testResult.error}
                </span>
              )}
            </div>
          )}

          {/* Save Result */}
          {saveSuccess && (
            <div className="p-3 rounded-md border bg-green-900/30 border-green-700 text-green-400 text-sm">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                SMTP configuration saved successfully.
              </span>
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-md border bg-red-900/30 border-red-700 text-red-400 text-sm">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {saveError}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={!isFormValid || isTesting}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Testing...
                </span>
              ) : (
                "Test Connection"
              )}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!isFormValid || !testPassed || isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Configuration"
              )}
            </button>
          </div>

          {!testPassed && isFormValid && (
            <p className="text-xs text-gray-500">
              Test the connection before saving. The Save button will be enabled after a successful test.
            </p>
          )}
        </form>
      </div>

      {/* Help Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Gmail App Password Setup</h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>
            To use Gmail SMTP, you need to generate an App Password. Your regular Gmail password will not work.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li>Enable 2-Step Verification on your Google Account</li>
            <li>Go to your Google Account security settings</li>
            <li>Under &quot;Signing in to Google,&quot; select App Passwords</li>
            <li>Generate a new App Password for &quot;Mail&quot;</li>
            <li>Use the 16-character password in the field above</li>
          </ol>
          <p className="pt-2">
            <a
              href="https://support.google.com/accounts/answer/185833"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Learn more about Gmail App Passwords →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
