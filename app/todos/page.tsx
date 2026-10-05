import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from("todos").select();

  return (
    <div style={{ padding: "40px", fontFamily: "monospace", color: "#fff", background: "#05080b", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "20px", marginBottom: "20px", color: "#36e0c4" }}>Supabase Connection Test</h1>
      {error && (
        <p style={{ color: "#ff3b45" }}>
          Notice: {error.message} (Create the &apos;todos&apos; table in Supabase or add your table name)
        </p>
      )}
      <ul style={{ paddingLeft: "20px" }}>
        {todos && todos.length > 0 ? (
          todos.map((todo: { id: string | number; name?: string; title?: string }) => (
            <li key={todo.id} style={{ margin: "8px 0" }}>
              {todo.name || todo.title || JSON.stringify(todo)}
            </li>
          ))
        ) : (
          <li style={{ color: "#888" }}>No todos found.</li>
        )}
      </ul>
    </div>
  );
}
