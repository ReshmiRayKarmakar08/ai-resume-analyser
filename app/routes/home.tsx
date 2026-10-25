import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { resumeStorage, type ResumeRecord } from "~/lib/resumeStorage";

import { Link } from "react-router";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind - AI Resume Analyzer" },
    { name: "description", content: "Smart AI feedback for your dream job with direct LLM API & Puter support!" },
  ];
}

export default function Home() {
  const puterStore = usePuterStore();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);
      try {
        const loaded = await resumeStorage.listResumes(puterStore);
        setResumes(loaded || []);
      } catch (e) {
        console.error("Error loading resumes:", e);
      } finally {
        setLoadingResumes(false);
      }
    };

    loadResumes();
  }, [puterStore.auth.isAuthenticated]);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover bg-no-repeat bg-top min-h-screen w-full overflow-x-hidden">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-6 sm:py-10 md:py-12">
          <h1>Track Your Applications &amp; Resume Ratings</h1>
          {!loadingResumes && resumes?.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get AI feedback.</h2>
          ) : (
            <h2>Review your past submissions and check AI-powered feedback.</h2>
          )}
        </div>

        {loadingResumes && (
          <div className="flex flex-col items-center justify-center py-12">
            <img src="/images/resume-scan-2.gif" className="w-[160px] sm:w-[200px]" alt="loading" />
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume as any} />
            ))}
          </div>
        )}

        {!loadingResumes && resumes?.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-6 gap-4">
            <Link to="/upload" className="primary-button !w-fit text-base sm:text-lg font-semibold px-6 py-3">
              Upload Resume
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}