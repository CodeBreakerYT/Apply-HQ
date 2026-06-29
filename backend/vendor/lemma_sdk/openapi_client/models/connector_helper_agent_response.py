from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.connector_helper_agent_response_operations_by_app import (
        ConnectorHelperAgentResponseOperationsByApp,
    )


T = TypeVar("T", bound="ConnectorHelperAgentResponse")


@_attrs_define
class ConnectorHelperAgentResponse:
    """Response model for the connector helper agent.

    Attributes:
        success (bool): Whether the helper agent completed successfully.
        answer_markdown (None | str | Unset): Detailed markdown guidance for accomplishing the requested goal.
        error (None | str | Unset): Error message when the helper agent fails.
        message (None | str | Unset): Human-readable status message.
        operations_by_app (ConnectorHelperAgentResponseOperationsByApp | Unset): Recommended operation names grouped by
            connector.
    """

    success: bool
    answer_markdown: None | str | Unset = UNSET
    error: None | str | Unset = UNSET
    message: None | str | Unset = UNSET
    operations_by_app: ConnectorHelperAgentResponseOperationsByApp | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        success = self.success

        answer_markdown: None | str | Unset
        if isinstance(self.answer_markdown, Unset):
            answer_markdown = UNSET
        else:
            answer_markdown = self.answer_markdown

        error: None | str | Unset
        if isinstance(self.error, Unset):
            error = UNSET
        else:
            error = self.error

        message: None | str | Unset
        if isinstance(self.message, Unset):
            message = UNSET
        else:
            message = self.message

        operations_by_app: dict[str, Any] | Unset = UNSET
        if not isinstance(self.operations_by_app, Unset):
            operations_by_app = self.operations_by_app.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "success": success,
            }
        )
        if answer_markdown is not UNSET:
            field_dict["answer_markdown"] = answer_markdown
        if error is not UNSET:
            field_dict["error"] = error
        if message is not UNSET:
            field_dict["message"] = message
        if operations_by_app is not UNSET:
            field_dict["operations_by_app"] = operations_by_app

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.connector_helper_agent_response_operations_by_app import (
            ConnectorHelperAgentResponseOperationsByApp,
        )

        d = dict(src_dict)
        success = d.pop("success")

        def _parse_answer_markdown(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        answer_markdown = _parse_answer_markdown(d.pop("answer_markdown", UNSET))

        def _parse_error(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        error = _parse_error(d.pop("error", UNSET))

        def _parse_message(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        message = _parse_message(d.pop("message", UNSET))

        _operations_by_app = d.pop("operations_by_app", UNSET)
        operations_by_app: ConnectorHelperAgentResponseOperationsByApp | Unset
        if isinstance(_operations_by_app, Unset):
            operations_by_app = UNSET
        else:
            operations_by_app = ConnectorHelperAgentResponseOperationsByApp.from_dict(
                _operations_by_app
            )

        connector_helper_agent_response = cls(
            success=success,
            answer_markdown=answer_markdown,
            error=error,
            message=message,
            operations_by_app=operations_by_app,
        )

        connector_helper_agent_response.additional_properties = d
        return connector_helper_agent_response

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
