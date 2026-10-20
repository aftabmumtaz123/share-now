import "dotenv/config";
import readline from "node:readline/promises";
import { randomInt } from "node:crypto";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db";
import { User } from "../lib/models";
import mongoose from "mongoose";
const rl=readline.createInterface({input,output});
async function main(){const username=(await rl.question("Admin username: ")).trim().toLowerCase();const displayName=(await rl.question("Admin display name: ")).trim()||username;const password=await rl.question("Admin password (minimum 12 characters): ");if(!/^[a-z0-9_.-]{3,32}$/.test(username))throw new Error("Username must be 3-32 characters: letters, numbers, dot, underscore or dash.");if(password.length<12)throw new Error("Use at least 12 characters for the admin password.");await connectDB();if(await User.exists({username}))throw new Error("Username already exists.");let code="";for(let i=0;i<50;i++){const candidate=String(randomInt(100000,1000000));if(!await User.exists({connectionCode:candidate})){code=candidate;break;}}if(!code)throw new Error("Could not generate a connection code.");await User.create({username,displayName,passwordHash:await bcrypt.hash(password,12),role:"admin",connectionCode:code,status:"active"});console.log(`Admin created: ${username} (connection code ${code})`);rl.close();await mongoose.disconnect();}
main().catch(async e=>{console.error(e instanceof Error?e.message:e);rl.close();await mongoose.disconnect().catch(()=>{});process.exit(1);});
