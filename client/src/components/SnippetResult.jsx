import LearningWorkspace from './LearningWorkspace';

export default function SnippetResult({ data, onClose }) {
  return (
    <LearningWorkspace
      sessionId={data.learning_session_id}
      fallbackAnalysis={data}
      onClose={onClose}
      mode="modal"
    />
  );
}