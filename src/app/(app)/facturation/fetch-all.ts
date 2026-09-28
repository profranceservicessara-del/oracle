// O PostgREST corta respostas em 1000 linhas sem avisar. Este helper busca em
// blocos com .range() até vir um bloco menor que o tamanho da página.
// A query passada DEVE ter ordenação estável (com desempate por id), senão
// linhas podem repetir ou sumir entre blocos.

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

type PageResult<T> = { data: T[] | null; error: unknown };

export async function fetchAllPages<T>(
  buildQuery: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    // Erro: devolve o que já veio, como as páginas faziam com `data ?? []`.
    if (error || !data) return { rows, truncated: false };

    rows.push(...data);
    if (data.length < PAGE_SIZE) return { rows, truncated: false };
  }

  return { rows, truncated: true };
}
