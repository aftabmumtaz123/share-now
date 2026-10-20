import CreateUserForm from "@/components/create-user-form";
export default function NewUserPage(){return <><div className="topbar"><div><div className="eyebrow">ADMINISTRATION / USERS</div><h1>Create a user</h1><p className="subtitle">Issue credentials to a trusted member of your workspace.</p></div></div><div className="panel" style={{maxWidth:650}}><CreateUserForm/></div></>}
