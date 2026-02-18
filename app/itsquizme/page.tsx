import { QuizContainer } from "@/components/ItsQuizMe";
import Nav from "@/components/main/Nav";
import Footer from "@/components/main/Footer";

export default function ItsQuizMePage() {
  return (
    <article className="pt-20 w-full col-flex items-center min-h-screen">
      <Nav />

      {/* Background gradient effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/15 dark:bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <main className="w-full max-w-4xl px-4 py-8 mb-20">
        <QuizContainer />
      </main>

      <Footer />
    </article>
  );
}
