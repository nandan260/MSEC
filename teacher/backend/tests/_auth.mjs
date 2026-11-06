import { signJwt } from "../dist/auth.js";

export const SECRET = "test-secret-please-change-0123456789abcdef";
process.env.AUTH_SECRET = SECRET;
const exp = () => Math.floor(Date.now() / 1000) + 3600;
export const token = (role, sub = "1") => signJwt({ sub, role, tv: 0, iat: 1, exp: exp() }, SECRET);
export const STUDENT_BEARER = `Bearer ${token("student")}`;
export const TEACHER_BEARER = `Bearer ${token("faculty", "2")}`;
