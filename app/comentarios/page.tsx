import BlogFeedbackSection from '@/components/Feedback/BlogFeedbackSection';
import MainLayout from '@/layouts/MainLayout';

export const metadata = {
  title: 'Comentarios - Xoco Café',
  description:
    'Comparte tus experiencias y revisa opiniones desde un panel exclusivo de comentarios.',
};

export default function CommentsPage() {
  return (
    <MainLayout>
      <BlogFeedbackSection />
    </MainLayout>
  );
}
