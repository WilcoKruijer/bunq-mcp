import { BunqContext } from "../BunqContext";
import { UserProfile } from "../types";

export class UserProfileAPI {
  #context: BunqContext;

  constructor(context: BunqContext) {
    this.#context = context;
  }

  async getUserSelf() {
    type UserSelfResponse = {
      Response: Array<{
        UserApiKey: {
          id: number;
          created: string;
          updated: string;
          requested_by_user: {
            UserPerson: {
              id: number;
              display_name: string;
              public_nick_name: string;
              avatar: {
                uuid: string;
                image: Array<{
                  attachment_public_uuid: string;
                  height: number;
                  width: number;
                  content_type: string;
                  urls: Array<{
                    type: string;
                    url: string;
                  }>;
                }>;
                anchor_uuid: string;
                style: string;
              };
              session_timeout: number;
            };
          };
          granted_by_user: {
            UserPerson: {
              id: number;
              display_name: string;
              public_nick_name: string;
              avatar: {
                uuid: string;
                image: Array<{
                  attachment_public_uuid: string;
                  height: number;
                  width: number;
                  content_type: string;
                  urls: Array<{
                    type: string;
                    url: string;
                  }>;
                }>;
                anchor_uuid: string;
                style: string;
              };
              session_timeout: number;
            };
          };
        };
      }>;
      Pagination: {
        future_url: string;
        newer_url: string | null;
        older_url: string | null;
      };
    };

    const data = await this.#context.makeSignedRequest<UserSelfResponse>(`/user`);
    return data;
  }

  async getEvents(userId: number = this.#context.token.userId) {
    const data = await this.#context.makeSignedRequest<unknown>(`/user/${userId}/event`);
    return data;
  }
}