import { ModalResponse } from "common/types";

// this is a separate module so it doesn't get reloaded when doing HMR
// otherwise cancelling dialogs after code has reloaded doesn't work properly.

interface ModalResolveMap {
  [modalId: string]: (response: ModalResponse) => void;
}
const modalResolves: ModalResolveMap = {};
export default modalResolves;
