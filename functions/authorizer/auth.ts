import * as O from "fp-ts/Option";
import { pipe } from "fp-ts/function";
import * as jwt from "jsonwebtoken";

export type JwtPayload = {
  personId: string;
  groups: string[];
};

export function decode_jwt(token: string | undefined): O.Option<JwtPayload> {
  return pipe(
    O.fromNullable(token),
    O.map(jwt.decode),
    O.map((decoded) => decoded as JwtPayload)
  );
}

export function userInAGroup(groups: string[]): boolean {
  return groups.some(
    (group) => group === "chat.admin" || group === "chat.user"
  );
}
