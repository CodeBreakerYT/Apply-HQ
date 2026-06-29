from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ConnectorHelperAgentRequest")


@_attrs_define
class ConnectorHelperAgentRequest:
    """Request model for the connector helper agent.

    Attributes:
        app_names (list[str]): Connector IDs the agent may use while planning the goal.
        goal (str): What the caller wants to achieve with one or more connectors.
    """

    app_names: list[str]
    goal: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        app_names = self.app_names

        goal = self.goal

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "app_names": app_names,
                "goal": goal,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        app_names = cast(list[str], d.pop("app_names"))

        goal = d.pop("goal")

        connector_helper_agent_request = cls(
            app_names=app_names,
            goal=goal,
        )

        connector_helper_agent_request.additional_properties = d
        return connector_helper_agent_request

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
