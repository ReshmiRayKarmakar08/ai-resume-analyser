import { useEffect } from "react";
import { useNavigate } from "react-router";

import type { Route } from "./+types/home";
import Navbar from "../components/Navbar";
import { resumes } from "../../constants";
import ResumeCard from "../components/ResumeCard";
import { usePuterStore } from "~/lib/puter";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job" },
  ];
}

export default function Home() {
  const { auth } = usePuterStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated) navigate("/auth?next=/");
  }, [auth.isAuthenticated, navigate]);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen flex flex-col">

      <Navbar />

      {/* Hero Section */}
      <section className="main-section py-16">
        <div className="page-heading text-center">
          <h1>Track Your Applications & Resume Ratings</h1>
          <h2>Review your submissions and check AI-powered feedback.</h2>
        </div>
      </section>

      {/* Resume Cards */}
      {resumes.length > 0 && (
        <div className="resume-section mt-10 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}

    </main>
  );
}