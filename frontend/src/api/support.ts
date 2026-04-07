import { authedFetch } from './authed'

async function readError(res: Response, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
    return (data as { error: string }).error
  }
  return res.statusText || 'Ошибка запроса'
}

export type SupportTicketCreated = {
  id: string
  createdAt: string
}

export async function createSupportTicket(token: string, subject: string, message: string): Promise<SupportTicketCreated> {
  const res = await authedFetch(token, '/api/support/tickets', {
    method: 'POST',
    body: JSON.stringify({ subject, message }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(await readError(res, data))
  return data as SupportTicketCreated
}
