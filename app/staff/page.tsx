import { redirect } from "next/navigation";

/**
 * /staff has no console of its own -- it's just the entrance. The proxy sends
 * logged-out visitors to /staff/login first; an authenticated staffer who hits
 * the bare URL lands on the queue (which is itself the authoritative gate).
 */
export default function StaffIndexPage(): never {
  redirect("/staff/queue");
}
