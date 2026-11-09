import { getRelevantKnowledge, listKnowledge } from "@/features/ai-agent/knowledge";

export default async function AITrainingPage() {
  const knowledge = await listKnowledge();
  const approved = knowledge.filter((k) => k.approved).length;
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">مركز تدريب الذكاء الاصطناعي</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">إجمالي المعرفة</div>
          <div className="text-2xl font-bold">{knowledge.length}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">المعتمدة</div>
          <div className="text-2xl font-bold">{approved}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">قيد المراجعة</div>
          <div className="text-2xl font-bold">{knowledge.length - approved}</div>
        </div>
      </div>
      <div className="space-y-2">
        {knowledge.map((k) => (
          <div key={k.id} className="rounded-lg border p-3 text-sm">
            <div className="font-medium">{k.type}</div>
            <div className="text-muted-foreground">{k.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}