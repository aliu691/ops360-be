export class CustomerUploadRowDto {
  name: string;

  contacts?: {
    name?: string;
    email?: string;
    mobile?: string;
  }[];
}
