import React from "react";
import styled, * as styles from "renderer/styles";

const StyledInput = styled.input`
  ${styles.searchInput()};
  min-width: 25em;
  padding-left: 10px;
  margin-left: 1.4em;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
`;

interface Props {
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export default (props: Props) => <StyledInput type="search" {...props} />;
