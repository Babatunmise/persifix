"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EditProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [age, setAge] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      await Promise.resolve();
      setName(localStorage.getItem("sanctos_name") || "");
      setTitle(localStorage.getItem("sanctos_title") || "");
      setAge(localStorage.getItem("sanctos_age") || "");
    };

    void loadProfile();
  }, []);

  const saveChanges = () => {
    localStorage.setItem("sanctos_name", name);
    localStorage.setItem("sanctos_title", title);
    localStorage.setItem("sanctos_age", age);
    router.push("/settings");
  };

  return (
    <main className="min-h-screen bg-[#121212] px-5 py-8 text-[#F9F8F6] sm:px-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl flex-col">
        <header className="mb-10 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Edit Profile
          </h1>
          <Link
            href="/settings"
            className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
          >
            Back to Settings
          </Link>
        </header>

        <section className="space-y-7">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-2 block text-sm font-medium text-neutral-400"
            >
              First Name
            </label>
            <input
              id="profile-name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4 text-lg text-[#F9F8F6] outline-none transition-colors placeholder:text-neutral-600 focus:border-[#2E5B44]"
              placeholder="Your first name"
            />
          </div>

          <div>
            <label
              htmlFor="profile-title"
              className="mb-2 block text-sm font-medium text-neutral-400"
            >
              Title
            </label>
            <select
              id="profile-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4 text-lg text-[#F9F8F6] outline-none transition-colors focus:border-[#2E5B44]"
            >
              <option value="" className="bg-neutral-900">
                Select a title
              </option>
              <option value="Sir" className="bg-neutral-900">
                Sir
              </option>
              <option value="Ma" className="bg-neutral-900">
                Ma
              </option>
              <option value="Chief" className="bg-neutral-900">
                Chief
              </option>
              <option value="Dr." className="bg-neutral-900">
                Dr.
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="profile-age"
              className="mb-2 block text-sm font-medium text-neutral-400"
            >
              Age
            </label>
            <input
              id="profile-age"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              max="120"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4 text-lg text-[#F9F8F6] outline-none transition-colors placeholder:text-neutral-600 focus:border-[#2E5B44]"
              placeholder="Your age"
            />
          </div>
        </section>

        <button
          type="button"
          onClick={saveChanges}
          className="mt-auto w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white transition-colors hover:bg-[#376b51] sm:mt-16"
        >
          Save Changes
        </button>
      </div>
    </main>
  );
}
