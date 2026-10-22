import { connectDB } from "@/lib/db";
import { User, Connection, Post } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Heart, MessageCircle, UserCircle, Users } from "lucide-react";
import PersonProfileActions from "@/components/person-profile-actions";

export default async function PersonProfile({ params }: { params: { id: string } }) {
  await connectDB();
  const me = await getCurrentUser();
  if (!me) notFound();

  const person = await User.findOne({ _id: params.id, status: "active", role: "user" })
    .select("displayName username avatar banner bio createdAt")
    .lean();
  if (!person) notFound();

  const isSelf = String(me._id) === String(person._id);
  // Mongoose lean() can infer a document-array union for this query; explicitly
  // narrow the optional single connection document for its status fields.
  const connection: any = isSelf ? null : await Connection.findOne({
    $or: [
      { requester: me._id, recipient: person._id },
      { requester: person._id, recipient: me._id },
    ],
  }).lean();

  const status: "none" | "incoming" | "outgoing" | "accepted" = !connection
    ? "none"
    : connection.status === "accepted"
      ? "accepted"
      : String(connection.requester) === String(me._id)
        ? "outgoing"
        : "incoming";
  const canViewPosts = status === "accepted" || isSelf;

  // Query post count independently from visibility so the profile can distinguish
  // a genuinely empty profile from posts hidden behind the connection boundary.
  const allPosts = await Post.find({ authorId: person._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const posts = canViewPosts ? allPosts : [];
  const memberSince = person.createdAt
    ? new Date(person.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "DevStak member";
  const hasNoPosts = allPosts.length === 0;

  return (
    <div className="social-profile person-profile-page">
      <Link href="/dashboard" className="profile-back"><ArrowLeft size={16} /> Back to dashboard</Link>

      <section className="panel person-profile-cover-card">
        <div className="person-profile-cover" style={person.banner ? { backgroundImage: `url("${person.banner.replace(/"/g, "\\\"")}")` } : undefined}>
          {!person.banner && <span className="person-profile-cover-glow" aria-hidden="true" />}
        </div>
        <div className="person-profile-identity">
          <div className="profile-photo person-profile-avatar">
            {person.avatar ? <img src={person.avatar} alt={`${person.displayName} profile picture`} /> : <UserCircle size={48} />}
          </div>
          <div className="person-profile-name">
            <h1>{person.displayName}</h1>
            <p className="muted">@{person.username}</p>
            <span className={`badge ${status === "accepted" ? "person-connected-badge" : status === "outgoing" ? "pending" : ""}`}>
              {isSelf ? "Your profile" : status === "accepted" ? "Connected" : status === "outgoing" ? "Request sent" : status === "incoming" ? "Wants to connect" : "DevStak member"}
            </span>
          </div>
          {!isSelf && <PersonProfileActions userId={String(person._id)} initialStatus={status} connectionId={connection ? String(connection._id) : undefined} />}
        </div>
        <div className="person-profile-details">
          <div className="person-profile-about">
            <h2>About</h2>
            <p>{person.bio?.trim() || "This member hasn't added a bio yet."}</p>
          </div>
          <div className="person-profile-meta">
            <span><CalendarDays size={16} /> Member since {memberSince}</span>
            <span><Users size={16} /> {status === "accepted" || isSelf ? "Connected on DevStak" : "Connect to share updates"}</span>
          </div>
        </div>
      </section>

      <section className="social-feed person-profile-posts">
        <div className="person-profile-post-heading">
          <div>
            <h2>Posts</h2>
            <p className="muted">Updates shared by {isSelf ? "you" : person.displayName}</p>
          </div>
          <span className="profile-post-count">{canViewPosts ? posts.length : hasNoPosts ? 0 : "Private"} {canViewPosts || hasNoPosts ? "posts" : ""}</span>
        </div>

        {!canViewPosts && !hasNoPosts ? (
          <div className="panel profile-empty-posts">
            <Users size={28} />
            <h3>Connect to view posts</h3>
            <p>Send a friend request to see {person.displayName}'s shared updates.</p>
          </div>
        ) : posts.length ? posts.map((post: any) => (
          <article className="panel profile-post-card" key={String(post._id)}>
            <div className="profile-post-author">
              {person.avatar ? <img src={person.avatar} alt="" /> : <span>{person.displayName?.charAt(0)?.toUpperCase() || "U"}</span>}
              <div><strong>{person.displayName}</strong><small>@{person.username} · {new Date(post.createdAt).toLocaleString()}</small></div>
            </div>
            {post.text && <p className="profile-post-copy">{post.text}</p>}
            {post.imageUrl && <img className="profile-post-image" src={post.imageUrl} alt="Post attachment" loading="lazy" />}
            <div className="profile-post-meta">
              <span><Heart size={15} /> {(post.likes || []).length} likes</span>
              <span><MessageCircle size={15} /> {(post.comments || []).length} comments</span>
            </div>
          </article>
        )) : (
          <div className="panel profile-empty-posts">
            <MessageCircle size={28} />
            <h3>No posts yet.</h3>
            <p>{isSelf ? "When you share an update, it will appear here." : `${person.displayName} hasn't shared any posts yet.`}</p>
          </div>
        )}
      </section>
    </div>
  );
}
